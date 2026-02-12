"""
Open 4 browsers, create a Tapeworm game with 4 players, and take a screenshot.

Usage:
    python scripts/preview-tapeworm.py [--port PORT]

Requires: pip install playwright && playwright install
Uses the running dev server (default localhost:3000).
"""

import argparse
import time

from playwright.sync_api import expect, sync_playwright

NAMES = ["Лихой Енот", "Модный Олень", "Чудной Хомяк", "Тихий Попугай"]


def wait_for_home(page):
    page.wait_for_selector(".home-title", timeout=10000)


def select_tapeworm(page):
    """Click the Tapeworm game logo on the home screen."""
    logos = page.locator(".game-selector-item")
    count = logos.count()
    for i in range(count):
        item = logos.nth(i)
        if "Червяк" in (item.text_content() or ""):
            item.locator("button").click()
            return
    raise RuntimeError("Tapeworm game not found in selector")


def set_name(page, name):
    """Set the player name in the home screen input."""
    inp = page.locator(".player-identity-input .input")
    inp.fill(name)


def create_room(page, name):
    """Create a room and return the room code."""
    set_name(page, name)
    select_tapeworm(page)
    btn = page.locator("button", has_text="Создать комнату")
    expect(btn).to_be_enabled(timeout=10000)
    btn.click()
    page.wait_for_selector(".room-code-value", timeout=10000)
    code = page.locator(".room-code-value").text_content()
    return code


def join_room(page, name, code):
    """Join a room by code."""
    set_name(page, name)
    btn = page.locator("button", has_text="Присоединиться")
    expect(btn).to_be_enabled(timeout=10000)
    btn.click()
    page.locator(".input-code").fill(code)
    page.locator("button", has_text="Войти").click()
    page.wait_for_selector(".room-code-value", timeout=10000)


def main():
    parser = argparse.ArgumentParser(description="Preview Tapeworm with 4 players")
    parser.add_argument("--port", type=int, default=3000, help="Dev server port")
    args = parser.parse_args()
    base_url = f"http://localhost:{args.port}"

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        # Create 4 separate contexts (separate sessions)
        pages = []
        for i in range(4):
            ctx = browser.new_context(
                viewport={"width": 430, "height": 932},  # iPhone 14 Pro Max
            )
            page = ctx.new_page()
            page.goto(base_url)
            wait_for_home(page)
            pages.append(page)

        # Player 1 creates the room
        code = create_room(pages[0], NAMES[0])
        print(f"Room created: {code}")

        # Players 2-4 join
        for i in range(1, 4):
            join_room(pages[i], NAMES[i], code)
            print(f"{NAMES[i]} joined")

        time.sleep(0.5)

        # Host starts the game
        start_btn = pages[0].locator("button", has_text="Начать игру")
        expect(start_btn).to_be_enabled(timeout=5000)
        start_btn.click()

        # Wait for game to load on all pages
        for i, page in enumerate(pages):
            page.wait_for_selector(".tapeworm-table", timeout=10000)

        time.sleep(1)  # let animations settle

        # Take screenshots
        for i, page in enumerate(pages):
            path = f"screenshots/tapeworm-player{i + 1}.png"
            page.screenshot(path=path, full_page=False)
            print(f"Screenshot saved: {path}")

        browser.close()
        print("Done!")


if __name__ == "__main__":
    main()
