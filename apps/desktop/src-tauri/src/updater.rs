//! Checks GitHub Releases for a newer signed build on launch and offers to install it.
//!
//! The endpoint and public key live in `tauri.conf.json` (`plugins.updater`). The
//! updater plugin verifies every download against that key before installing.

use tauri::AppHandle;
use tauri_plugin_dialog::{DialogExt, MessageDialogButtons, MessageDialogKind};
use tauri_plugin_updater::UpdaterExt;

type BoxError = Box<dyn std::error::Error + Send + Sync>;

/// Runs the update check in the background so it never blocks startup.
pub fn spawn_check(app: AppHandle) {
  tauri::async_runtime::spawn(async move {
    if let Err(error) = check_and_prompt(&app).await {
      log::warn!("update check failed: {error}");
    }
  });
}

async fn check_and_prompt(app: &AppHandle) -> Result<(), BoxError> {
  let Some(update) = app.updater()?.check().await? else {
    return Ok(());
  };

  let message = format!(
    "Xolace {} is available (you have {}). Install it now? Xolace will restart.",
    update.version, update.current_version
  );
  let dialog = app
    .dialog()
    .message(message)
    .title("Update available")
    .kind(MessageDialogKind::Info)
    .buttons(MessageDialogButtons::OkCancelCustom(
      "Install and restart".into(),
      "Later".into(),
    ));
  // blocking_show must not run on the main thread or an async worker.
  let accepted = tauri::async_runtime::spawn_blocking(move || dialog.blocking_show()).await?;
  if !accepted {
    return Ok(());
  }

  // On Windows the installer closes the app itself; restart covers macOS and Linux.
  update.download_and_install(|_, _| {}, || {}).await?;
  app.restart();
}
