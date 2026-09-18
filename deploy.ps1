$envFile = "c:\Users\Pc\Desktop\barber.shop-website\admin\.env.local"
$line = (Get-Content $envFile | Select-String "VERCEL_OIDC_TOKEN").Line
$token = $line.Split('=')[1].Trim('"')

Write-Host "Deploying to Vercel using Token..."
$env:VERCEL_TOKEN = $token
npx vercel@59.22.0 deploy --prod --yes 2>&1
