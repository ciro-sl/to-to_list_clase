@echo off
setlocal
set "JAVA_HOME=C:\Program Files (x86)\Java\jdk-17.0.12"
set "ANDROID_HOME=C:\Android\Sdk"
set "PATH=%JAVA_HOME%\bin;C:\Android\Sdk\cmdline-tools\latest\bin;C:\Android\Sdk\platform-tools;%PATH%"
cd /d "%~dp0"
call gradlew.bat --stop
call gradlew.bat assembleRelease --no-daemon --console=plain --stacktrace
endlocal
