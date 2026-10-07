[Setup]
AppId={{8D0A9D47-3A9B-4C6E-9D53-202610060001}}
AppName=DougDrive
AppVersion=1.0.0
AppPublisher=DougHub
DefaultDirName={userpf}\DougDrive
DefaultGroupName=DougDrive
OutputDir=..\release
OutputBaseFilename=DougDrive Setup
Compression=lzma
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=lowest
CloseApplications=force
RestartApplications=yes
UninstallDisplayIcon={app}\DougDrive.exe

[Tasks]
Name: "startup"; Description: "Start DougDrive when Windows starts"; Flags: unchecked
Name: "desktopicon"; Description: "Create a desktop shortcut"; Flags: unchecked

[Files]
Source: "..\dist\DougDrive.exe"; DestDir: "{app}"; Flags: ignoreversion restartreplace

[Dirs]
Name: "{userprofile}\DougDrive"
Name: "{userstartup}"

[Icons]
Name: "{group}\DougDrive"; Filename: "{app}\DougDrive.exe"
Name: "{userdesktop}\DougDrive"; Filename: "{app}\DougDrive.exe"; Tasks: desktopicon
Name: "{userstartup}\DougDrive"; Filename: "{app}\DougDrive.exe"; Tasks: startup

[Run]
Filename: "{app}\DougDrive.exe"; Description: "Launch DougDrive"; Flags: nowait postinstall skipifsilent
