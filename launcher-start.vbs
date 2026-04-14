Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "C:\Bureau\notes"
WshShell.Run """C:\Program Files\nodejs\node.exe"" launcher.js", 0, False
