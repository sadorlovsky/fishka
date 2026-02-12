import re

from conftest import create_room, join_room
from playwright.sync_api import expect


def test_create_room_redirects_to_lobby(page):
    code = create_room(page)
    assert re.match(r"^[A-Z2-9]{4}$", code), f"Invalid room code: {code}"
    expect(page).to_have_url(re.compile(rf"/room/{code}$"))


def test_lobby_shows_room_code(page):
    code = create_room(page)
    expect(page.locator(".room-code-value")).to_have_text(code)


def test_lobby_header_shows_lobby_text(page):
    create_room(page)
    expect(page.locator(".lobby-header h2")).to_contain_text("Лобби")


def test_host_sees_disabled_start_button(page):
    create_room(page)
    btn = page.locator("button", has_text=re.compile(r"Нужен|Начать"))
    expect(btn).to_be_visible()
    expect(btn).to_be_disabled()


def test_leave_room_returns_home(page):
    create_room(page)
    page.locator("button", has_text="Выйти").click()
    page.wait_for_selector(".home-title")
    expect(page).to_have_url(re.compile(r"/$"))


def test_second_player_joins(page, second_page):
    code = create_room(page)

    # Second player joins
    second_page.goto("/")
    second_page.wait_for_selector(".home-title")
    join_room(second_page, code)

    # Both should see 2 players in the roster
    expect(page.locator(".player-list-item")).to_have_count(2)
    expect(second_page.locator(".player-list-item")).to_have_count(2)


def test_non_host_sees_waiting_text(page, second_page):
    code = create_room(page)

    second_page.goto("/")
    second_page.wait_for_selector(".home-title")
    join_room(second_page, code)

    expect(second_page.locator(".waiting-host-text")).to_be_visible()


def test_host_start_enabled_with_two_players(page, second_page):
    code = create_room(page)

    second_page.goto("/")
    second_page.wait_for_selector(".home-title")
    join_room(second_page, code)

    btn = page.locator("button", has_text="Начать игру")
    expect(btn).to_be_visible()
    expect(btn).to_be_enabled()


def test_click_room_code_copies_link(page):
    code = create_room(page)
    page.locator(".room-code").click()
    expect(page.locator(".room-code-label")).to_have_text("Ссылка скопирована!")


def test_player_leave_updates_roster(page, second_page):
    code = create_room(page)

    second_page.goto("/")
    second_page.wait_for_selector(".home-title")
    join_room(second_page, code)

    expect(page.locator(".player-list-item")).to_have_count(2)

    # Second player leaves
    second_page.locator("button", has_text="Выйти").click()

    # Host should see only 1 player
    expect(page.locator(".player-list-item")).to_have_count(1)
