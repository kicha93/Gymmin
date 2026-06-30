@echo off
setlocal

if "%ANDROID_SDK_ROOT%"=="" (
  echo ANDROID_SDK_ROOT is not set.
  exit /b 1
)

set SDKMANAGER=%ANDROID_SDK_ROOT%\cmdline-tools\latest\bin\sdkmanager.bat

if not exist "%SDKMANAGER%" (
  echo sdkmanager.bat was not found at "%SDKMANAGER%".
  exit /b 1
)

(for /L %%i in (1,1,100) do @echo y) | "%SDKMANAGER%" --sdk_root="%ANDROID_SDK_ROOT%" --licenses
