# URL del servidor web 
$UrlApi = 'http://10.51.17.205:5000/api/equipos'

# DATOS BASICOS
$pc       = $env:COMPUTERNAME
$usuario  = $env:USERNAME
$dominio  = $env:USERDOMAIN

# IP IPv4 valida
$ipObj = Get-NetIPAddress -AddressFamily IPv4 |
         Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254*' } |
         Select-Object -First 1
$ip = if ($ipObj) { $ipObj.IPAddress } else { 'Sin_IP' }

# Adaptador de red activo
$adaptador = Get-NetAdapter | Where-Object { $_.Status -eq 'Up' } | Select-Object -First 1
if ($adaptador) {
    $mac = $adaptador.MacAddress
    if ($adaptador.InterfaceDescription -match 'USB') {
        $tipoNIC = 'Externa USB'
    }
    elseif ($adaptador.InterfaceDescription -match 'Wi-Fi|Wireless') {
        $tipoNIC = 'Integrada WiFi'
    }
    else {
        $tipoNIC = 'Integrada Ethernet' 
    }
}
else {
    $mac = 'Sin_MAC'
    $tipoNIC = 'Desconocida'
}

# Sistema operativo real
$so = (Get-CimInstance Win32_OperatingSystem).Caption

# RAM total en GB
$ram = (Get-CimInstance Win32_PhysicalMemory | Measure-Object -Property Capacity -Sum).Sum / 1GB
$ramGB = [math]::Round($ram, 0)

# Procesador
$cpu = (Get-CimInstance Win32_Processor | Select-Object -First 1).Name

# Disco C: total en GB
$discoC = (Get-CimInstance Win32_LogicalDisk | Where-Object { $_.DeviceID -eq 'C:' }).Size / 1GB
$discoGB = [math]::Round($discoC, 0)

# Modelo, marca y tipo de recurso
$pcInfo   = Get-CimInstance Win32_ComputerSystem
$modelo   = $pcInfo.Model
$marcaHw  = $pcInfo.Manufacturer
$serial   = (Get-CimInstance Win32_BIOS).SerialNumber

# Clasificar tipo de recurso (CPU / NUC / LAPTOP / MOVIL)
if ($modelo -match 'NUC') {
    $tipoRecurso = 'NUC'
}
elseif ($modelo -match 'LAPTOP|NOTEBOOK|BOOK|ThinkPad|EliteBook|Latitude' -or $pcInfo.PCSystemType -eq 2) {
    $tipoRecurso = 'LAPTOP'
}
elseif ($modelo -match 'TABLET|MOBILE|PHONE') {
    $tipoRecurso = 'DISPOSITIVO MOVIL'
}
else {
    $tipoRecurso = 'CPU'
}

# Ubicacion y observaciones
$ubicacion = 'Por definir'
$observaciones = ''

# Crear objeto con los datos
$datos = @{
    nombre_pc         = $pc
    usuario           = $usuario
    dominio           = $dominio
    direccion_ip      = $ip
    direccion_mac     = $mac
    tipo_tarjeta_red  = $tipoNIC
    sistema_operativo = $so
    ram_gb            = $ramGB
    procesador        = $cpu
    disco_gb          = $discoGB
    modelo_pc         = $modelo
    no_serie          = $serial
    tipo_recurso      = $tipoRecurso
    marca             = $marcaHw
    ubicacion         = $ubicacion
    observaciones     = $observaciones
    fecha_inventario  = (Get-Date -Format 'yyyy-MM-dd')
}

# Convertir a JSON
$json = $datos | ConvertTo-Json -Compress

Write-Host "🌐 Enviando a: $UrlApi" -ForegroundColor Cyan
Write-Host "📦 Datos JSON: $json" -ForegroundColor Cyan

# Enviar POST a la API
try {
    Write-Host "⏳ Esperando respuesta del servidor..." -ForegroundColor Yellow
    $response = Invoke-WebRequest -Uri $UrlApi -Method POST -Body $json -ContentType 'application/json' -UseBasicParsing -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Datos enviados correctamente al servidor web" -ForegroundColor Green
        Write-Host "📨 Respuesta: $($response.Content)" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Respuesta inesperada del servidor: $($response.StatusCode)" -ForegroundColor Yellow
        Write-Host "📨 Contenido: $($response.Content)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Error al enviar datos: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "🔍 Detalle: $($_.Exception)" -ForegroundColor Red
}

# RESULTADO
Write-Host ""
Write-Host "📊 DATOS RECOPILADOS:" -ForegroundColor Cyan
Write-Host "  PC       : $pc"
Write-Host "  Usuario  : $usuario"
Write-Host "  Dominio  : $dominio"
Write-Host "  IP       : $ip"
Write-Host "  MAC      : $mac"
Write-Host "  Tipo NIC : $tipoNIC"
Write-Host "  SO       : $so"
Write-Host "  RAM      : ${ramGB}GB"
Write-Host "  CPU      : $cpu"
Write-Host "  Disco C: : ${discoGB}GB"
Write-Host "  Modelo   : $modelo"
Write-Host "  Serial   : $serial"
Write-Host ""

Read-Host "Presiona ENTER para cerrar esta ventana"