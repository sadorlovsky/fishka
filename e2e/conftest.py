import os
import signal
import socket
import subprocess
import time
import urllib.request

import pytest
from playwright.sync_api import expect


def get_free_port():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("", 0))
        return s.getsockname()[1]


def wait_for_server(url, timeout=15):
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            urllib.request.urlopen(url, timeout=2)
            return True
        except Exception:
            time.sleep(0.3)
    raise RuntimeError(f"Server did not start within {timeout}s at {url}")


@pytest.fixture(scope="session")
def server():
    port = get_free_port()
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    env = {**os.environ, "PORT": str(port), "NODE_ENV": "test"}

    proc = subprocess.Popen(
        ["bun", "src/index.ts"],
        cwd=root,
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )

    try:
        wait_for_server(f"http://localhost:{port}")
    except RuntimeError:
        proc.kill()
        stdout = proc.stdout.read().decode() if proc.stdout else ""
        raise RuntimeError(f"Server failed to start. Output:\n{stdout}")

    yield {"port": port, "url": f"http://localhost:{port}"}

    os.kill(proc.pid, signal.SIGTERM)
    proc.wait(timeout=5)


@pytest.fixture(scope="session")
def base_url(server):
    return server["url"]


@pytest.fixture()
def page(browser, base_url):
    context = browser.new_context(base_url=base_url)
    p = context.new_page()
    p.goto("/")
    p.wait_for_selector(".home-title")
    yield p
    context.close()


@pytest.fixture()
def second_page(browser, base_url):
    context = browser.new_context(base_url=base_url)
    p = context.new_page()
    yield p
    context.close()


def create_room(page):
    """Helper: create a room and return the room code."""
    btn = page.locator("button", has_text="Создать комнату")
    # Wait until WS is connected (button becomes enabled)
    expect(btn).to_be_enabled(timeout=10000)
    btn.click()
    page.wait_for_selector(".room-code-value")
    code = page.locator(".room-code-value").text_content()
    return code


def join_room(page, code):
    """Helper: join a room by code."""
    btn = page.locator("button", has_text="Присоединиться")
    expect(btn).to_be_enabled(timeout=10000)
    btn.click()
    page.locator(".input-code").fill(code)
    page.locator("button", has_text="Войти").click()
    page.wait_for_selector(".room-code-value")
