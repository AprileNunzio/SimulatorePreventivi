; Custom NSIS script per SimulatorePreventivi
; Installa in C:\NunzioTech\SimulatorePreventivi con shortcut Desktop

!macro customInit
  StrCpy $INSTDIR "C:\NunzioTech\SimulatorePreventivi"
!macroend

!macro customInstall
  ; Crea la cartella dati nella directory di installazione
  CreateDirectory "$INSTDIR\data"
  CreateDirectory "$INSTDIR\data\backups"
  CreateDirectory "$INSTDIR\data\exports"
  
  ; Shortcut Desktop con icona
  CreateShortcut "$DESKTOP\Simulatore Preventivi.lnk" "$INSTDIR\Simulatore Preventivi.exe" "" "$INSTDIR\resources\assets\icon.ico" 0
  
  ; Shortcut Start Menu
  CreateDirectory "$SMPROGRAMS\NunzioTech"
  CreateShortcut "$SMPROGRAMS\NunzioTech\Simulatore Preventivi.lnk" "$INSTDIR\Simulatore Preventivi.exe" "" "$INSTDIR\resources\assets\icon.ico" 0
  CreateShortcut "$SMPROGRAMS\NunzioTech\Disinstalla Simulatore Preventivi.lnk" "$INSTDIR\Uninstall Simulatore Preventivi.exe"
!macroend

!macro customUnInstall
  ; Rimuovi shortcut Desktop
  Delete "$DESKTOP\Simulatore Preventivi.lnk"
  
  ; Rimuovi Start Menu
  Delete "$SMPROGRAMS\NunzioTech\Simulatore Preventivi.lnk"
  Delete "$SMPROGRAMS\NunzioTech\Disinstalla Simulatore Preventivi.lnk"
  RMDir "$SMPROGRAMS\NunzioTech"
!macroend
