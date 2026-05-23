@echo off
echo ============================================
echo  No Limit Stock -- Recuperation IndexedDB
echo ============================================
echo.
echo ETAPE 1 : Extraction des donnees IndexedDB
echo   Lance une fenetre Electron. Clique "Demarrer le scan"
echo   puis "Enregistrer le JSON" et note l'emplacement du fichier.
echo.
pause

cd /d "%~dp0.."
node_modules\electron\dist\electron.exe recover\main.cjs

echo.
echo ============================================
echo  ETAPE 2 : Migration du format
echo ============================================
echo.
set /p RECOVERY_FILE="Chemin du fichier JSON recupere : "

if not exist "%RECOVERY_FILE%" (
  echo Fichier introuvable : %RECOVERY_FILE%
  pause
  exit /b 1
)

node recover\migrate.cjs "%RECOVERY_FILE%"

echo.
echo Termine. Le fichier migre se trouve a cote du fichier source.
echo Importe-le dans l'app via : Parametres -> Importer une sauvegarde
echo.
pause
