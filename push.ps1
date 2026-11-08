$git = "C:\Program Files\Git\cmd\git.exe"

Write-Host "1. Configurando identidade Git do usuario..."
& $git config user.name "Tibimawin"
& $git config user.email "tibimawin@users.noreply.github.com"

Write-Host "2. Configurando branch main..."
& $git branch -M main

Write-Host "3. Indexando todos os arquivos..."
& $git add -A

Write-Host "4. Criando commit com a nova versao..."
& $git commit -m "feat: Versao 2026 - Central de Backup & Restauracao, Mapeamento Inteligente de Tabelas Baserow e correcoes de seguranca"

Write-Host "5. Verificando commit criado..."
& $git log -1 --oneline

Write-Host "6. Enviando para o GitHub (https://github.com/Tibimawin/remix-of-tibimmanagerpainel2026)..."
& $git push -u origin main --force

Write-Host "=== CONCLUIDO COM SUCESSO! ==="
