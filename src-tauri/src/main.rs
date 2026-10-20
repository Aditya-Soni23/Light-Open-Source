#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{
  menu::{Menu, MenuItem},
  tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
  webview::WebviewWindowBuilder,
  Manager, WebviewUrl, WindowEvent,
};

const MAIN_WINDOW: &str = "main";
const APP_PORT: u16 = 49321;

fn show_main_window(app: &tauri::AppHandle) {
  if let Some(window) = app.get_webview_window(MAIN_WINDOW) {
    let _ = window.show();
    let _ = window.unminimize();
    let _ = window.set_focus();
  }
}

fn main() {
  tauri::Builder::default()
    // Firebase Auth only supports OAuth from http(s) origins. In a packaged
    // Tauri app the default `tauri.localhost` origin is rejected, so serve the
    // bundled assets from a real loopback origin instead.
    .plugin(tauri_plugin_localhost::Builder::new(APP_PORT).build())
    .plugin(tauri_plugin_updater::Builder::new().build())
    .setup(|app| {
      // tauri-plugin-localhost only responds to paths that resolve to a
      // bundled asset. `/` is not an asset name, while `/index.html` is.
      // Opening the root path caused the packaged WebView to receive HTTP 500.
      let app_url = format!("http://localhost:{APP_PORT}/index.html")
        .parse()
        .expect("localhost application URL must be valid");
      WebviewWindowBuilder::new(app, MAIN_WINDOW, WebviewUrl::External(app_url))
        .title("LIGHT by DIAMOND")
        .inner_size(1240.0, 800.0)
        .min_inner_size(900.0, 620.0)
        .resizable(true)
        .decorations(false)
        .transparent(false)
        .build()?;

      let show = MenuItem::with_id(app, "show", "Open LIGHT", true, None::<&str>)?;
      let quit = MenuItem::with_id(app, "quit", "Quit LIGHT", true, None::<&str>)?;
      let menu = Menu::with_items(app, &[&show, &quit])?;
      let tray_icon = app
        .default_window_icon()
        .expect("a bundled LIGHT icon is required")
        .clone();

      TrayIconBuilder::with_id("light-tray")
        .icon(tray_icon)
        .tooltip("LIGHT by DIAMOND")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
          "show" => show_main_window(app),
          "quit" => app.exit(0),
          _ => {}
        })
        .on_tray_icon_event(|tray, event| {
          if let TrayIconEvent::Click {
            button: MouseButton::Left,
            button_state: MouseButtonState::Up,
            ..
          } = event
          {
            show_main_window(tray.app_handle());
          }
        })
        .build(app)?;

      Ok(())
    })
    .on_window_event(|window, event| {
      if window.label() == MAIN_WINDOW {
        if let WindowEvent::CloseRequested { api, .. } = event {
        let _ = window.hide();
        api.prevent_close();
        }
      }
    })
    .run(tauri::generate_context!())
    .expect("error while running LIGHT");
}
