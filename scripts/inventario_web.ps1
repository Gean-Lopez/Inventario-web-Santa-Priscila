Clear-Host
$Host.UI.RawUI.WindowTitle = "Inventario de Equipos - Santa Priscila"

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

function Titulo-Seccion($texto) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor DarkCyan
    Write-Host " $texto" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor DarkCyan
    Write-Host ""
}

function Mostrar-Resumen($pc, $usuario, $ip, $mac, $so, $ramGB, $cpu, $discoGB, $modelo, $serial, $departamento, $area, $responsableEquipo) {
    Titulo-Seccion "DATOS RECOPILADOS"
    Write-Host "  PC           : " -NoNewline -ForegroundColor DarkGray
    Write-Host $pc -ForegroundColor White

    Write-Host "  Usuario      : " -NoNewline -ForegroundColor DarkGray
    Write-Host $usuario -ForegroundColor White

    Write-Host "  IP           : " -NoNewline -ForegroundColor DarkGray
    Write-Host $ip -ForegroundColor White

    Write-Host "  MAC          : " -NoNewline -ForegroundColor DarkGray
    Write-Host $mac -ForegroundColor White

    Write-Host "  SO           : " -NoNewline -ForegroundColor DarkGray
    Write-Host $so -ForegroundColor White

    Write-Host "  RAM          : " -NoNewline -ForegroundColor DarkGray
    Write-Host "$($ramGB) GB" -ForegroundColor White

    Write-Host "  CPU          : " -NoNewline -ForegroundColor DarkGray
    Write-Host $cpu -ForegroundColor White

    Write-Host "  Disco        : " -NoNewline -ForegroundColor DarkGray
    Write-Host "$($discoGB) GB" -ForegroundColor White

    Write-Host "  Modelo       : " -NoNewline -ForegroundColor DarkGray
    Write-Host $modelo -ForegroundColor White

    Write-Host "  Serial       : " -NoNewline -ForegroundColor DarkGray
    Write-Host $serial -ForegroundColor White

    Write-Host "  Departamento : " -NoNewline -ForegroundColor DarkGray
    Write-Host $departamento -ForegroundColor White

    Write-Host "  Area         : " -NoNewline -ForegroundColor DarkGray
    Write-Host $area -ForegroundColor White

    Write-Host "  Responsable  : " -NoNewline -ForegroundColor DarkGray
    Write-Host $responsableEquipo -ForegroundColor White
    Write-Host ""
}

function Mostrar-ResultadoFinal($estadoFinal, $detalleFinal) {
    Titulo-Seccion "RESULTADO FINAL"

    switch ($estadoFinal) {
        'OK' {
            Write-Host "  Datos enviados" -ForegroundColor Green
            Write-Host "  Detalle: $detalleFinal" -ForegroundColor Green
        }
        'DUPLICADO' {
            Write-Host "  Equipo duplicado" -ForegroundColor Yellow
            Write-Host "  Detalle: $detalleFinal" -ForegroundColor Yellow
        }
        default {
            Write-Host "  Error al enviar a la base" -ForegroundColor Red
            Write-Host "  Detalle: $detalleFinal" -ForegroundColor Red
        }
    }

    Write-Host ""
}

Titulo-Seccion "INVENTARIO DE EQUIPOS"
Write-Host "Iniciando asistente de registro..." -ForegroundColor Gray
Start-Sleep -Milliseconds 500

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

Titulo-Seccion "AUTENTICACION ADMINISTRADOR"

$token = $null
$loginCorrecto = $false

while (-not $loginCorrecto) {
    $adminUser = Read-Host "Usuario admin (o escriba SALIR para cancelar)"
    if ($adminUser.Trim().ToUpper() -eq 'SALIR') {
        Write-Host ""
        Write-Host "Proceso cancelado por el usuario." -ForegroundColor Yellow
        Write-Host ""
        Read-Host "Presiona ENTER para cerrar"
        exit
    }

    $adminPassSecure = Read-Host "Contrasena admin" -AsSecureString
    $adminPass = Convertir-SecureStringAPlano $adminPassSecure

    try {
        $loginBody = @{
            username = $adminUser
            password = $adminPass
        } | ConvertTo-Json -Compress

        $loginResponse = Invoke-RestMethod -Uri $UrlLogin -Method POST -Body $loginBody -ContentType 'application/json' -TimeoutSec 10

        if (-not $loginResponse.token) {
            throw "No se recibió token del login"
        }

        $token = $loginResponse.token
        $loginCorrecto = $true
        Write-Host ""
        Write-Host "Acceso correcto." -ForegroundColor Green
    }
    catch {
        Write-Host ""
        Write-Host "Usuario o contrasena incorrectos. Intente nuevamente." -ForegroundColor Red
        Write-Host ""
    }
}

Titulo-Seccion "DATOS ADMINISTRATIVOS DEL EQUIPO"

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

$estadoFinal = 'ERROR'
$detalleFinal = 'No se pudo completar el proceso.'

Titulo-Seccion "ENVIO DE INFORMACION"
Write-Host "Enviando datos al servidor..." -ForegroundColor Cyan

try {
    $headers = @{
        Authorization = "Bearer $token"
    }

    $response = Invoke-WebRequest -Uri $UrlApi -Method POST -Body $json -ContentType 'application/json' -Headers $headers -UseBasicParsing -TimeoutSec 10

    if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 300) {
        $estadoFinal = 'OK'
        $detalleFinal = 'Datos enviados correctamente.'
    } else {
        $estadoFinal = 'ERROR'
        $detalleFinal = "Respuesta inesperada del servidor: $($response.StatusCode)"
    }
}
catch {
    $statusCode = $null
    $responseBody = $null

    if ($_.Exception.Response) {
        try {
            $statusCode = $_.Exception.Response.StatusCode.value__
        } catch {
            $statusCode = $null
        }

        try {
            $stream = $_.Exception.Response.GetResponseStream()
            if ($stream) {
                $reader = New-Object System.IO.StreamReader($stream)
                $responseBody = $reader.ReadToEnd()
                $reader.Close()
            }
        } catch {
            $responseBody = $null
        }
    }

    if ($statusCode -eq 409) {
        $estadoFinal = 'DUPLICADO'
        $detalleFinal = 'Equipo duplicado. Ya existe un registro similar en la base de datos.'
    }
    elseif ($responseBody -match 'duplicado|duplicate|ya existe') {
        $estadoFinal = 'DUPLICADO'
        $detalleFinal = 'Equipo duplicado. Ya existe un registro similar en la base de datos.'
    }
    else {
        $estadoFinal = 'ERROR'
        if ($statusCode) {
            $detalleFinal = "Error al enviar a la base de datos. Código HTTP: $statusCode"
        } else {
            $detalleFinal = "Error al enviar a la base de datos: $($_.Exception.Message)"
        }
    }
}

Start-Sleep -Milliseconds 300
Clear-Host
$Host.UI.RawUI.WindowTitle = "Inventario de Equipos - Resultado final"

Mostrar-Resumen `
    -pc $pc `
    -usuario $usuario `
    -ip $ip `
    -mac $mac `
    -so $so `
    -ramGB $ramGB `
    -cpu $cpu `
    -discoGB $discoGB `
    -modelo $modelo `
    -serial $serial `
    -departamento $departamento `
    -area $area `
    -responsableEquipo $responsableEquipo

Mostrar-ResultadoFinal -estadoFinal $estadoFinal -detalleFinal $detalleFinal

Read-Host "Presiona ENTER para cerrar"
