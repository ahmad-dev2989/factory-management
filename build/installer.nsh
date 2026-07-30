!macro customUnInstall
  MessageBox MB_YESNO|MB_ICONQUESTION "Do you also want to remove all application data (including SQLite database, preferences, and backups)?" IDNO +2
  RMDir /r "$APPDATA\factory-project"
!macroend
