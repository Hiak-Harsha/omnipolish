Set WshShell = CreateObject("WScript.Shell")
strPath = WshShell.CurrentDirectory
WshShell.Run """" & strPath & "\.venv\Scripts\pythonw.exe"" -m omnipolish.main --tray", 0, False
Set WshShell = Nothing
