# URL del servidor web
$UrlApi = 'http://10.51.17.205:5000/api/equipos'
$UrlLogin = 'http://10.51.17.205:5000/api/login'

function Leer-SiNo($mensaje) {
    do {
        $valor = (Read-Host "$mensaje (SI/NO)").Trim().ToUpper()
        if ($valor -eq '') { return $null }
    } while ($valor -ne 'SI' -and $valor -ne 'NO')
    return $valor
}

function Convertir-SecureStringAPlano($secureString) {
    $bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureString)
    try {
        return [System.Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
    } finally {
        [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
    }
}

Write-Host ""
Write-Host "==============================" -ForegroundColor Cyan
Write-Host " INVENTARIO DE EQUIPOS" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan
Write-Host ""

$pc       = $env:COMPUTERNAME
$usuario  = $env:USERNAME
$dominio  = $env:USERDOMAIN

$ipObj = Get-NetIPAddress -AddressFamily IPv4 |
         Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254*' } |
         Select-Object -First 1
$ip = if ($ipObj) { $ipObj.IPAddress } else { 'Sin_IP' }

$adaptador = Get-NetAdapter | Where-Object { $_.Status -eq 'Up' } | Select-Object -First 1
if ($adaptador) {
    $mac = $adaptador.MacAddress
    if ($adaptador.InterfaceDescription -match 'USB') { $tipoNIC = 'Externa USB' }
    elseif ($adaptador.InterfaceDescription -match 'Wi-Fi|Wireless') { $tipoNIC = 'Integrada WiFi' }
    else { $tipoNIC = 'Integrada Ethernet' }
} else {
    $mac = 'Sin_MAC'
    $tipoNIC = 'Desconocida'
}

$so      = (Get-CimInstance Win32_OperatingSystem).Caption
$ram     = (Get-CimInstance Win32_PhysicalMemory | Measure-Object -Property Capacity -Sum).Sum / 1GB
$ramGB   = [math]::Round($ram, 0)
$cpu     = (Get-CimInstance Win32_Processor | Select-Object -First 1).Name
$discoC  = (Get-CimInstance Win32_LogicalDisk | Where-Object { $_.DeviceID -eq 'C:' }).Size / 1GB
$discoGB = [math]::Round($discoC, 0)
$pcInfo  = Get-CimInstance Win32_ComputerSystem
$modelo  = $pcInfo.Model
$marcaHw = $pcInfo.Manufacturer
$serial  = (Get-CimInstance Win32_BIOS).SerialNumber

if ($modelo -match 'NUC') { $tipoRecurso = 'NUC' }
elseif ($modelo -match 'LAPTOP|NOTEBOOK|BOOK|ThinkPad|EliteBook|Latitude' -or $pcInfo.PCSystemType -eq 2) { $tipoRecurso = 'LAPTOP' }
elseif ($modelo -match 'TABLET|MOBILE|PHONE') { $tipoRecurso = 'DISPOSITIVO MOVIL' }
else { $tipoRecurso = 'CPU' }

Write-Host ""
Write-Host "Credenciales de administrador para enviar el inventario:" -ForegroundColor Yellow
Write-Host ""

$adminUser = Read-Host "Usuario admin"
$adminPassSecure = Read-Host "Contrasena admin" -AsSecureString
$adminPass = Convertir-SecureStringAPlano $adminPassSecure

Write-Host ""
Write-Host "Complete los datos administrativos del equipo:" -ForegroundColor Yellow
Write-Host ""

$establecimiento        = Read-Host "Establecimiento"
$departamento           = Read-Host "Departamento"
$area                   = Read-Host "Area"
$jefeArea               = Read-Host "Jefe de area"
$responsableEquipo      = Read-Host "Responsable del equipo"
$contrasena             = Read-Host "Contrasena"
$tieneLicenciaWindows   = Leer-SiNo "Tiene licencia Windows"
$codigoLicenciaWindows  = Read-Host "Codigo licencia Windows"
$tieneLicenciaOffice    = Leer-SiNo "Tiene licencia Office"
$antivirus              = Read-Host "Antivirus"
$tieneMouse             = Leer-SiNo "Tiene mouse"
$tieneTeclado           = Leer-SiNo "Tiene teclado"
$tieneParlante          = Leer-SiNo "Tiene parlante"
$ubicacion              = Read-Host "Ubicacion"
$etiquetado             = Read-Host "Etiquetado"
$observacion            = Read-Host "Observacion"

$datos = @{
    nombre_pc                = $pc
    nombre_host              = $pc
    usuario                  = $usuario
    dominio                  = $dominio
    active_directory         = $dominio
    direccion_ip             = $ip
    ip                       = $ip
    direccion_mac            = $mac
    mac_address              = $mac
    tipo_tarjeta_red         = $tipoNIC
    sistema_operativo        = $so
    ram_gb                   = $ramGB
    ram                      = "$($ramGB) GB"
    procesador               = $cpu
    disco_gb                 = $discoGB
    disco                    = "$($discoGB) GB"
    modelo_pc                = $modelo
    modelo                   = $modelo
    no_serie                 = $serial
    serie                    = $serial
    tipo_recurso             = $tipoRecurso
    marca                    = $marcaHw

    establecimiento          = $establecimiento
    departamento             = $departamento
    area                     = $area
    jefe_area                = $jefeArea
    responsable_equipo       = $responsableEquipo
    contrasena               = $contrasena
    tiene_licencia_windows   = $tieneLicenciaWindows
    codigo_licencia_windows  = $codigoLicenciaWindows
    tiene_licencia_office    = $tieneLicenciaOffice
    antivirus                = $antivirus
    tiene_mouse              = $tieneMouse
    tiene_teclado            = $tieneTeclado
    tiene_parlante           = $tieneParlante
    ubicacion                = $ubicacion
    etiquetado               = $etiquetado
    observacion              = $observacion
    observaciones            = $observacion
    fecha_inventario         = (Get-Date -Format 'yyyy-MM-dd')
    activo                   = 'SI'
    empresa                  = 'Santa Priscila'
}

$json = $datos | ConvertTo-Json -Compress
Write-Host "🌐 Enviando a: $UrlApi" -ForegroundColor Cyan
Write-Host "📦 Datos JSON: $json" -ForegroundColor Cyan

try {
    $loginBody = @{
        username = $adminUser
        password = $adminPass
    } | ConvertTo-Json -Compress

    $loginResponse = Invoke-RestMethod -Uri $UrlLogin -Method POST -Body $loginBody -ContentType 'application/json' -TimeoutSec 10
    $token = $loginResponse.token

    if (-not $token) {
        throw "No se recibió token del login"
    }

    $headers = @{
        Authorization = "Bearer $token"
    }

    $response = Invoke-WebRequest -Uri $UrlApi -Method POST -Body $json -ContentType 'application/json' -Headers $headers -UseBasicParsing -TimeoutSec 10

    if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 300) {
        Write-Host "✅ Datos enviados correctamente" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Respuesta inesperada: $($response.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "📊 DATOS RECOPILADOS:" -ForegroundColor Cyan
Write-Host "  PC           : $pc"
Write-Host "  Usuario      : $usuario"
Write-Host "  IP           : $ip"
Write-Host "  MAC          : $mac"
Write-Host "  SO           : $so"
Write-Host "  RAM          : $($ramGB) GB"
Write-Host "  CPU          : $cpu"
Write-Host "  Disco        : $($discoGB) GB"
Write-Host "  Modelo       : $modelo"
Write-Host "  Serial       : $serial"
Write-Host "  Departamento : $departamento"
Write-Host "  Area         : $area"
Write-Host "  Responsable  : $responsableEquipo"
Write-Host ""

Read-Host "Presiona ENTER para cerrar"
