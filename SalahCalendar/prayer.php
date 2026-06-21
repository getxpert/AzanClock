<?php
/**
 * prayer.php — Prayer Times iCalendar Feed (v2.3 engine)
 *
 * Query parameters:
 *   cid          string    optional  Calendar ID (dynamic calendar key)
 *                                    If provided, all params are loaded from DB.
 *   lat          float     required  Latitude  (-90  to  90)
 *   lng          float     required  Longitude (-180 to 180)
 *   method       string    default MWL  Calculation method key (e.g. MWL, ISNA, Makkah)
 *                                       Legacy integers 0-7 also accepted for backward compat
 *   asr          string    default Standard  Asr juristic: Standard or Hanafi
 *                                       Legacy: 0=Standard, 1=Hanafi
 *   elv          float     default 0   Elevation in meters
 *   before       int       default 0   Minutes before adhan (rounded to 5)
 *   after        int       default 30  Minutes after adhan  (rounded to 5)
 *   hours_before int       default 0   Hours before now to include
 *   hours_after  int       default 720 Hours after  now to include (30 days)
 *   tz           string    default UTC IANA timezone e.g. Europe/London
 *   prayers      string    default fajr,dhuhr,asr,maghrib,isha
 *   location     string    default ""  Location label for calendar name
 *
 * Example:
 *   prayer.php?lat=51.5074&lng=-0.1278&method=MWL&tz=Europe%2FLondon&before=15&after=30
 *   prayer.php?cid=a3b7x9k2
 */
require_once __DIR__ . '/config.php';

// =====================================================================
//  EMBEDDED PrayTimes class (v2.3)
//  Port of PrayTimes.js v2.3 by Hamid Zarrabi-Zadeh — GNU LGPL v3
//  Methods from CalculationMethods.js (AzanClock)
// =====================================================================

class PrayTimes
{
    // All 23 calculation methods matching CalculationMethods.js
    private static $methods = [
        'Algerian'          => ['name' => 'Algerian Ministry of Religious Affairs',          'params' => ['fajr' => 18,   'isha' => 17],                                                    'methodOffsets' => []],
        'Egypt'             => ['name' => 'Egyptian General Authority of Survey',             'params' => ['fajr' => 19.5, 'isha' => 17.5],                                                  'methodOffsets' => []],
        'FranceAngle18'     => ['name' => 'France - 18° Angle',                              'params' => ['fajr' => 18,   'isha' => 18],                                                    'methodOffsets' => []],
        'FranceUOIFAngle12' => ['name' => 'France UOIF - 12° Angle',                         'params' => ['fajr' => 12,   'isha' => 12],                                                    'methodOffsets' => []],
        'ISNA'              => ['name' => 'ISNA (Islamic Society of North America)',          'params' => ['fajr' => 15,   'isha' => 15],                                                    'methodOffsets' => []],
        'JAKIM'             => ['name' => 'Jabatan Kemajuan Islam Malaysia',                  'params' => ['fajr' => 20,   'isha' => 18],                                                    'methodOffsets' => []],
        'Jordan'            => ['name' => 'Jordan Ministry of Awqaf',                         'params' => ['fajr' => 18,   'isha' => 18],                                                    'methodOffsets' => ['maghrib' => 5]],
        'KEMENAG'           => ['name' => 'Kementrian Agama Indonesia',                       'params' => ['fajr' => 20,   'isha' => 18],                                                    'methodOffsets' => []],
        'Kuwait'            => ['name' => 'Kuwait',                                           'params' => ['fajr' => 18,   'isha' => 17.5],                                                  'methodOffsets' => []],
        'UIPTL'             => ['name' => 'London Unified Islamic Prayer Timetable',          'params' => ['fajr' => 12,   'isha' => 12],                                                    'methodOffsets' => []],
        'MUIS'              => ['name' => 'Majlis Ugama Islam Singapura',                     'params' => ['fajr' => 20,   'isha' => 18],                                                    'methodOffsets' => []],
        'MoonSightingCommittee' => ['name' => 'Moon Sighting Committee',                      'params' => ['fajr' => 18,   'isha' => 18],                                                    'methodOffsets' => ['dhuhr' => 5, 'maghrib' => 3]],
        'Habous'            => ['name' => 'Moroccan Ministry of Habous and Islamic Affairs',  'params' => ['fajr' => 19.1, 'isha' => 17],                                                    'methodOffsets' => ['sunrise' => -5, 'dhuhr' => 5, 'maghrib' => 5]],
        'MWL'               => ['name' => 'Muslim World League',                              'params' => ['fajr' => 18,   'isha' => 17],                                                    'methodOffsets' => []],
        'Qatar'             => ['name' => 'Qatar',                                            'params' => ['fajr' => 18,   'isha' => '90 min'],                                              'methodOffsets' => []],
        'Karachi'           => ['name' => 'University of Islamic Sciences, Karachi',          'params' => ['fajr' => 18,   'isha' => 18],                                                    'methodOffsets' => []],
        'Makkah'            => ['name' => 'Umm Al-Qura University, Makkah',                   'params' => ['fajr' => 18.5, 'isha' => '90 min'],                                              'methodOffsets' => []],
        'Dubai'             => ['name' => 'UAE / Dubai',                                      'params' => ['fajr' => 18.2, 'isha' => 18.2],                                                  'methodOffsets' => []],
        'Tunusian'          => ['name' => 'Tunisian Ministry of Religious Affairs',           'params' => ['fajr' => 18,   'isha' => 18],                                                    'methodOffsets' => []],
        'TurkiyeDiyanet'    => ['name' => 'Türkiye Diyanet İşleri Başkanlığı',                'params' => ['fajr' => 18,   'isha' => 17],                                                    'methodOffsets' => ['sunrise' => -7, 'fajr' => -1, 'dhuhr' => 5, 'asr' => 5, 'maghrib' => 8, 'isha' => 1]],
        'Diyanet15Degrees'  => ['name' => 'Turkish Diyanet Offsets with 15° Angles',          'params' => ['fajr' => 15,   'isha' => 15],                                                    'methodOffsets' => ['imsak' => -1, 'sunrise' => -9, 'dhuhr' => 5, 'asr' => 5, 'maghrib' => 7, 'isha' => -1]],
        'Tehran'            => ['name' => 'University of Tehran',                             'params' => ['fajr' => 17.7, 'isha' => 14, 'maghrib' => 5.5, 'midnight' => 'Jafari'],          'methodOffsets' => []],
    ];

    private static $defaultParams = ['maghrib' => '0 min', 'midnight' => 'Standard'];

    private $calcMethod = 'MWL';
    private $setting = [];
    private $offset = [];
    private $lat;
    private $lng;
    private $elv;
    private $timeZone;
    private $jDate;

    public function __construct($method = 'MWL')
    {
        $this->setting = [
            'imsak'    => '10 min',
            'dhuhr'    => '0 min',
            'asr'      => 'Standard',
            'highLats' => 'AngleBased',
        ];

        // Apply default params to all methods
        foreach (self::$methods as $key => &$m) {
            foreach (self::$defaultParams as $dk => $dv) {
                if (!isset($m['params'][$dk])) {
                    $m['params'][$dk] = $dv;
                }
            }
        }
        unset($m);

        // Set initial method
        $this->setMethod($method);

        // Init offsets
        $timeNames = ['imsak','fajr','sunrise','dhuhr','asr','sunset','maghrib','isha'];
        foreach ($timeNames as $n) {
            $this->offset[$n] = 0;
        }
    }

    public function setMethod($method)
    {
        if (isset(self::$methods[$method])) {
            $this->calcMethod = $method;
            $params = self::$methods[$method]['params'];
            foreach ($params as $id => $val) {
                $this->setting[$id] = $val;
            }
            // Apply method offsets
            $this->offset = array_fill_keys(['imsak','fajr','sunrise','dhuhr','asr','sunset','maghrib','isha'], 0);
            $offsets = self::$methods[$method]['methodOffsets'] ?? [];
            foreach ($offsets as $k => $v) {
                $this->offset[$k] = $v;
            }
        }
    }

    public function adjust($params)
    {
        foreach ($params as $id => $val) {
            $this->setting[$id] = $val;
        }
    }

    public function tune($offsets)
    {
        foreach ($offsets as $k => $v) {
            $this->offset[$k] = $v;
        }
    }

    public function getMethod() { return $this->calcMethod; }
    public function getMethodName() { return self::$methods[$this->calcMethod]['name'] ?? $this->calcMethod; }

    public static function getAllMethods() { return self::$methods; }

    /**
     * Get prayer times for a given date.
     * Returns associative array of float hours for each prayer.
     */
    public function getTimes($year, $month, $day, $latitude, $longitude, $timezone, $elevation = 0)
    {
        $this->lat      = 1.0 * $latitude;
        $this->lng      = 1.0 * $longitude;
        $this->elv      = $elevation ? 1.0 * $elevation : 0;
        $this->timeZone = 1.0 * $timezone;
        $this->jDate    = $this->julian($year, $month, $day) - $this->lng / (15 * 24);
        return $this->computeTimes();
    }

    // ── Computation ──────────────────────────────────────────────────

    private function computeTimes()
    {
        $times = [
            'imsak' => 5, 'fajr' => 5, 'sunrise' => 6, 'dhuhr' => 12,
            'asr' => 13, 'sunset' => 18, 'maghrib' => 18, 'isha' => 18,
        ];

        $times = $this->computePrayerTimes($times);
        $times = $this->adjustTimes($times);

        // Duha & DuhaEnd
        $times['duha']    = $times['sunrise'] + 15.0 / 60;
        $times['duhaend'] = $times['dhuhr'] - 10.0 / 60;

        // Apply method offsets (tune)
        $times = $this->tuneTimes($times);

        // Imsak gets fajr's offset too
        $times['imsak'] = $times['imsak'] + ($this->offset['fajr'] ?? 0) / 60;
        // DuhaEnd gets dhuhr's offset
        $times['duhaend'] = $times['duhaend'] + ($this->offset['dhuhr'] ?? 0) / 60;

        // Midnight
        $times['midnight'] = $times['maghrib'] + $this->timeDiff($times['maghrib'], $times['fajr']) / 2;

        return $times;
    }

    private function computePrayerTimes($times)
    {
        $times = $this->dayPortion($times);
        $params = $this->setting;

        $imsak   = $this->sunAngleTime($this->evalParam($params['imsak']),   $times['imsak'],   'ccw');
        $fajr    = $this->sunAngleTime($this->evalParam($params['fajr']),    $times['fajr'],    'ccw');
        $sunrise = $this->sunAngleTime($this->riseSetAngle(),                $times['sunrise'], 'ccw');
        $dhuhr   = $this->midDay($times['dhuhr']);
        $asr     = $this->asrTime($this->asrFactor($params['asr']),          $times['asr']);
        $sunset  = $this->sunAngleTime($this->riseSetAngle(),                $times['sunset']);
        $maghrib = $this->sunAngleTime($this->evalParam($params['maghrib']), $times['maghrib']);
        $isha    = $this->sunAngleTime($this->evalParam($params['isha']),    $times['isha']);

        return [
            'imsak' => $imsak, 'fajr' => $fajr, 'sunrise' => $sunrise, 'dhuhr' => $dhuhr,
            'asr' => $asr, 'sunset' => $sunset, 'maghrib' => $maghrib, 'isha' => $isha,
        ];
    }

    private function adjustTimes($times)
    {
        $params = $this->setting;

        // Add timezone offset
        foreach ($times as $k => &$v) {
            $v += $this->timeZone - $this->lng / 15;
        }
        unset($v);

        // High latitude adjustment
        if ($params['highLats'] !== 'None') {
            $times = $this->adjustHighLats($times);
        }

        // isMin adjustments
        if ($this->isMin($params['imsak'])) {
            $times['imsak'] = $times['fajr'] - $this->evalParam($params['imsak']) / 60;
        }
        if ($this->isMin($params['maghrib'])) {
            $times['maghrib'] = $times['sunset'] + $this->evalParam($params['maghrib']) / 60;
        }
        if ($this->isMin($params['isha'])) {
            $times['isha'] = $times['maghrib'] + $this->evalParam($params['isha']) / 60;
        }

        // Dhuhr offset
        $times['dhuhr'] += $this->evalParam($params['dhuhr']) / 60;

        return $times;
    }

    private function tuneTimes($times)
    {
        foreach ($times as $k => &$v) {
            if (isset($this->offset[$k])) {
                $v += $this->offset[$k] / 60;
            }
        }
        unset($v);
        return $times;
    }

    // ── High Latitude Adjustments ────────────────────────────────────

    private function adjustHighLats($times)
    {
        $params = $this->setting;
        $nightTime = $this->timeDiff($times['sunset'], $times['sunrise']);

        $times['imsak']   = $this->adjustHLTime($times['imsak'],   $times['sunrise'], $this->evalParam($params['imsak']),   $nightTime, 'ccw');
        $times['fajr']    = $this->adjustHLTime($times['fajr'],    $times['sunrise'], $this->evalParam($params['fajr']),    $nightTime, 'ccw');
        $times['isha']    = $this->adjustHLTime($times['isha'],    $times['sunset'],  $this->evalParam($params['isha']),    $nightTime);
        $times['maghrib'] = $this->adjustHLTime($times['maghrib'], $times['sunset'],  $this->evalParam($params['maghrib']), $nightTime);

        return $times;
    }

    private function adjustHLTime($time, $base, $angle, $night, $direction = null)
    {
        $portion = $this->nightPortion($angle, $night);
        $timeDiff = ($direction === 'ccw')
            ? $this->timeDiff($time, $base)
            : $this->timeDiff($base, $time);
        if (is_nan($time) || $timeDiff > $portion) {
            $time = $base + ($direction === 'ccw' ? -$portion : $portion);
        }
        return $time;
    }

    private function nightPortion($angle, $night)
    {
        $method = $this->setting['highLats'];
        $portion = 0.5; // NightMiddle default
        if ($method === 'AngleBased') {
            $portion = 1.0 / 60 * $angle;
        }
        if ($method === 'OneSeventh') {
            $portion = 1.0 / 7;
        }
        return $portion * $night;
    }

    // ── Asr ──────────────────────────────────────────────────────────

    private function asrFactor($asrParam)
    {
        $factors = ['Standard' => 1, 'Hanafi' => 2];
        return $factors[$asrParam] ?? $this->evalParam($asrParam);
    }

    private function asrTime($factor, $time)
    {
        $decl = $this->sunPosition($this->jDate + $time)['declination'];
        $angle = -$this->darccot($factor + $this->dtan(abs($this->lat - $decl)));
        return $this->sunAngleTime($angle, $time);
    }

    // ── Sun Position ─────────────────────────────────────────────────

    private function riseSetAngle()
    {
        $angle = 0.0347 * sqrt($this->elv);
        return 0.833 + $angle;
    }

    private function midDay($time)
    {
        $eqt = $this->sunPosition($this->jDate + $time)['equation'];
        return $this->fixHour(12 - $eqt);
    }

    private function sunAngleTime($angle, $time, $direction = null)
    {
        $decl = $this->sunPosition($this->jDate + $time)['declination'];
        $noon = $this->midDay($time);
        $t = 1.0 / 15 * $this->darccos(
            (-$this->dsin($angle) - $this->dsin($decl) * $this->dsin($this->lat)) /
            ($this->dcos($decl) * $this->dcos($this->lat))
        );
        return $noon + ($direction === 'ccw' ? -$t : $t);
    }

    private function sunPosition($jd)
    {
        $D  = $jd - 2451545.0;
        $g  = $this->fixAngle(357.529 + 0.98560028 * $D);
        $q  = $this->fixAngle(280.459 + 0.98564736 * $D);
        $L  = $this->fixAngle($q + 1.915 * $this->dsin($g) + 0.020 * $this->dsin(2 * $g));
        $e  = 23.439 - 0.00000036 * $D;
        $RA = $this->darctan2($this->dcos($e) * $this->dsin($L), $this->dcos($L)) / 15;
        $eqt = $q / 15 - $this->fixHour($RA);
        $decl = $this->darcsin($this->dsin($e) * $this->dsin($L));
        return ['declination' => $decl, 'equation' => $eqt];
    }

    private function julian($year, $month, $day)
    {
        if ($month <= 2) { $year--; $month += 12; }
        $A = floor($year / 100);
        $B = 2 - $A + floor($A / 4);
        return floor(365.25 * ($year + 4716)) + floor(30.6001 * ($month + 1)) + $day + $B - 1524.5;
    }

    // ── Helpers ──────────────────────────────────────────────────────

    private function dayPortion($times)
    {
        foreach ($times as $k => &$v) { $v /= 24; }
        unset($v);
        return $times;
    }

    private function timeDiff($t1, $t2)
    {
        return $this->fixHour($t2 - $t1);
    }

    private function evalParam($str)
    {
        return floatval(preg_replace('/[^0-9.+\-]/', '', (string)$str));
    }

    private function isMin($arg)
    {
        return strpos((string)$arg, 'min') !== false;
    }

    // ── Trig (degree-based) ──────────────────────────────────────────

    private function dtr($d) { return ($d * M_PI) / 180.0; }
    private function rtd($r) { return ($r * 180.0) / M_PI; }
    private function dsin($d)  { return sin($this->dtr($d)); }
    private function dcos($d)  { return cos($this->dtr($d)); }
    private function dtan($d)  { return tan($this->dtr($d)); }
    private function darcsin($x) { return $this->rtd(asin($x)); }
    private function darccos($x) { return $this->rtd(acos($x)); }
    private function darctan2($y, $x) { return $this->rtd(atan2($y, $x)); }
    private function darccot($x)  { return $this->rtd(atan(1.0 / $x)); }

    private function fixAngle($a)
    {
        $a = $a - 360.0 * floor($a / 360.0);
        return $a < 0 ? $a + 360.0 : $a;
    }

    private function fixHour($a)
    {
        $a = $a - 24.0 * floor($a / 24.0);
        return $a < 0 ? $a + 24.0 : $a;
    }
}
// =====================================================================
//  END PrayTimes class
// =====================================================================


// ---- Helper: sanitise a GET string --------------------------------
function get_str(string $key, string $default = '', int $maxlen = 200): string
{
    if (!isset($_GET[$key])) return $default;
    return substr(strip_tags($_GET[$key]), 0, $maxlen);
}

// ---- Helper: get float from GET ----------------------------------
function get_float(string $key, ?float $default = null): ?float
{
    if (!isset($_GET[$key])) return $default;
    $v = filter_var($_GET[$key], FILTER_VALIDATE_FLOAT);
    return ($v === false) ? $default : (float)$v;
}

// ---- Helper: get int from GET ------------------------------------
function get_int(string $key, int $default = 0, int $min = PHP_INT_MIN, int $max = PHP_INT_MAX): int
{
    $v = isset($_GET[$key]) ? (int)$_GET[$key] : $default;
    return max($min, min($max, $v));
}

// ---- Helper: RFC 5545 line folding (character-safe) ---------------
function ical_fold(string $line): string
{
    $chars  = preg_split('//u', $line, -1, PREG_SPLIT_NO_EMPTY);
    $result = '';
    $col    = 0;
    foreach ($chars as $ch) {
        $bytes = strlen($ch);
        if ($col + $bytes > 75) {
            $result .= "\r\n ";
            $col = 1;
        }
        $result .= $ch;
        $col += $bytes;
    }
    return $result . "\r\n";
}

// ---- Helper: escape iCal text values ----------------------------
function ical_escape(string $s): string
{
    $s = str_replace('\\', '\\\\', $s);
    $s = str_replace(';',  '\;',   $s);
    $s = str_replace(',',  '\,',   $s);
    $s = str_replace("\r\n", '\n', $s);
    $s = str_replace("\n",   '\n', $s);
    return $s;
}

// Error response helper
function abort(int $code, string $msg): void
{
    http_response_code($code);
    header('Content-Type: text/plain; charset=utf-8');
    echo $msg . "\n";
    exit;
}

// =====================================================================
//  Dynamic Calendar ID (cid) Support
//  If ?cid=KEY is provided, load params from salah_calendars table
// =====================================================================
$cid = get_str('cid', '', 36);
$dynamic_calendar_id = null;  // DB id for access logging

if ($cid !== '') {
    try {
        $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4';
        $pdo = new PDO($dsn, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]);

        $stmt = $pdo->prepare('SELECT id, params FROM salah_calendars WHERE calendar_key = ?');
        $stmt->execute([$cid]);
        $cal = $stmt->fetch();

        if (!$cal) {
            abort(404, "Calendar not found for key: {$cid}");
        }

        $dynamic_calendar_id = (int)$cal['id'];
        $stored_params = json_decode($cal['params'], true);

        if (is_array($stored_params)) {
            // Inject stored params into $_GET so existing parsing below works
            foreach ($stored_params as $pk => $pv) {
                if (!isset($_GET[$pk]) || $_GET[$pk] === '') {
                    $_GET[$pk] = (string)$pv;
                }
            }
        }

        // ── Log access ───────────────────────────────────────
        $user_ip = $_SERVER['REMOTE_ADDR'] ?? '';
        // Check for forwarded IP
        if (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
            $user_ip = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR'])[0];
        }
        // Convert IPv6-mapped IPv4 (e.g. ::ffff:192.168.1.1) to plain IPv4
        if (substr($user_ip, 0, 7) === '::ffff:') {
            $user_ip = substr($user_ip, 7);
        }
        $user_agent = $_SERVER['HTTP_USER_AGENT'] ?? '';

        // Parse device/OS/app from user agent
        $details = ['user_agent' => substr($user_agent, 0, 500)];
        if (preg_match('/\b(iPhone|iPad|iPod)\b/i', $user_agent, $dm)) {
            $details['device'] = $dm[1];
            $details['os'] = 'iOS';
            if (preg_match('/OS (\d+[_\.]\d+)/i', $user_agent, $vm)) {
                $details['version'] = str_replace('_', '.', $vm[1]);
            }
        } elseif (preg_match('/Android\s*([\d.]+)?/i', $user_agent, $dm)) {
            $details['os'] = 'Android';
            if (!empty($dm[1])) $details['version'] = $dm[1];
        } elseif (preg_match('/Windows NT\s*([\d.]+)?/i', $user_agent, $dm)) {
            $details['os'] = 'Windows';
            if (!empty($dm[1])) $details['version'] = $dm[1];
        } elseif (preg_match('/Macintosh|Mac OS X/i', $user_agent)) {
            $details['os'] = 'macOS';
            if (preg_match('/Mac OS X (\d+[_\.]\d+)/i', $user_agent, $vm)) {
                $details['version'] = str_replace('_', '.', $vm[1]);
            }
        } elseif (preg_match('/Linux/i', $user_agent)) {
            $details['os'] = 'Linux';
        }

        // Detect calendar app
        if (preg_match('/Thunderbird/i', $user_agent)) {
            $details['app'] = 'Thunderbird';
        } elseif (preg_match('/Microsoft Outlook/i', $user_agent)) {
            $details['app'] = 'Microsoft Outlook';
        } elseif (preg_match('/Google-Calendar/i', $user_agent)) {
            $details['app'] = 'Google Calendar';
        } elseif (preg_match('/CalendarAgent|dataaccessd|CalendarStore/i', $user_agent)) {
            $details['app'] = 'Apple Calendar';
        }

        try {
            $logStmt = $pdo->prepare(
                'INSERT INTO access_logs (calendar_id, user_ip, details) VALUES (?, ?, ?)'
            );
            $logStmt->execute([$dynamic_calendar_id, trim($user_ip), json_encode($details)]);
        } catch (Exception $logEx) {
            error_log('SalahCalendar access_log error: ' . $logEx->getMessage());
        }

    } catch (PDOException $e) {
        error_log('SalahCalendar DB error: ' . $e->getMessage());
        abort(500, "Database error. Please try again later.");
    }
}

// =====================================================================
//  Parse & validate inputs
// =====================================================================
$lat          = get_float('lat');
$lng          = get_float('lng');
$elv          = get_float('elv', 0.0);
$before_raw   = get_int('before',       0, 0, 180);
$after_raw    = get_int('after',       30, 0, 180);
$hours_before = get_int('hours_before', 0, 0, 8760);
$hours_after  = get_int('hours_after', 720, 1, 17520);
$tz_raw       = get_str('tz', 'UTC', 64);
$prayers_raw  = get_str('prayers', 'fajr,dhuhr,asr,maghrib,isha', 100);
$location_raw = get_str('location', '', 100);

// Method: accept string keys or legacy integer IDs
$method_raw = get_str('method', 'MWL', 64);
$legacy_method_map = [
    '0' => 'Tehran', '1' => 'Karachi', '2' => 'ISNA', '3' => 'MWL',
    '4' => 'Makkah', '5' => 'Egypt',   '6' => 'MWL',  '7' => 'Tehran',
];
$method = $legacy_method_map[$method_raw] ?? $method_raw;
$all_methods = PrayTimes::getAllMethods();
if (!isset($all_methods[$method])) {
    $method = 'MWL';
}

// ASR: accept Standard/Hanafi or legacy 0/1
$asr_raw = get_str('asr', 'Standard', 20);
$legacy_asr_map = ['0' => 'Standard', '1' => 'Hanafi'];
$asr = $legacy_asr_map[$asr_raw] ?? $asr_raw;
if (!in_array($asr, ['Standard', 'Hanafi'])) {
    $asr = 'Standard';
}

// Round before/after to nearest 5 min
$before = (int)(round($before_raw / 5) * 5);
$after  = (int)(round($after_raw  / 5) * 5);

// Enforce minimum 5-min event window
if ($before === 0 && $after === 0) $after = 5;

if ($lat === null || $lng === null) {
    abort(400, "Missing required parameters: 'lat' and 'lng'.\n"
             . "Example: prayer.php?lat=51.5074&lng=-0.1278&method=MWL&tz=Europe%2FLondon");
}
if ($lat < -90 || $lat > 90)    abort(400, "Latitude must be between -90 and 90.");
if ($lng < -180 || $lng > 180)  abort(400, "Longitude must be between -180 and 180.");

// Timezone
$tz_clean = preg_replace('/[^A-Za-z0-9\/_.+\-]/', '', $tz_raw);
try {
    $timezone = new DateTimeZone($tz_clean);
} catch (Exception $e) {
    $timezone = new DateTimeZone('UTC');
    $tz_clean = 'UTC';
}

// Prayer index map (string keys matching PrayTimes output)
$prayers_map = [
    'imsak'   => ['key' => 'imsak',    'en' => 'Imsak',    'ar' => 'الإمساك'],
    'fajr'    => ['key' => 'fajr',     'en' => 'Fajr',     'ar' => 'الفجر'],
    'sunrise' => ['key' => 'sunrise',  'en' => 'Sunrise',  'ar' => 'الشروق'],
    'dhuhr'   => ['key' => 'dhuhr',    'en' => 'Dhuhr',    'ar' => 'الظهر'],
    'asr'     => ['key' => 'asr',      'en' => 'Asr',      'ar' => 'العصر'],
    'sunset'  => ['key' => 'sunset',   'en' => 'Sunset',   'ar' => 'الغروب'],
    'maghrib' => ['key' => 'maghrib',  'en' => 'Maghrib',  'ar' => 'المغرب'],
    'isha'    => ['key' => 'isha',     'en' => 'Isha',     'ar' => 'العشاء'],
    'midnight'=> ['key' => 'midnight', 'en' => 'Midnight', 'ar' => 'منتصف الليل'],
];

$selected_keys = array_values(array_filter(
    array_map('trim', explode(',', strtolower($prayers_raw))),
    fn($k) => isset($prayers_map[$k])
));
if (empty($selected_keys)) {
    $selected_keys = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
}

// =====================================================================
//  Compute date window
// =====================================================================
$now         = new DateTime('now', $timezone);
$range_start = (clone $now)->modify("-{$hours_before} hours");
$range_end   = (clone $now)->modify("+{$hours_after} hours");

$loop_date = new DateTime($range_start->format('Y-m-d') . ' 00:00:00', $timezone);
$loop_end  = new DateTime($range_end->format('Y-m-d')   . ' 00:00:00', $timezone);

// =====================================================================
//  Build iCal
// =====================================================================
$method_label = $all_methods[$method]['name'] ?? $method;
$location_label = $location_raw ?: "{$lat}, {$lng}";

$cal_name = "Prayer Times · {$method_label}";
$cal_desc = "Prayer times for {$location_label} | Method: {$method_label} | Timezone: {$tz_clean}";

$ical  = "BEGIN:VCALENDAR\r\n";
$ical .= "VERSION:2.0\r\n";
$ical .= ical_fold("PRODID:-//SalahCalendar//Prayer Times Calendar 2.3//EN");
$ical .= "CALSCALE:GREGORIAN\r\n";
$ical .= "METHOD:PUBLISH\r\n";
$ical .= ical_fold("X-WR-CALNAME:" . ical_escape($cal_name));
$ical .= ical_fold("X-WR-CALDESC:" . ical_escape($cal_desc));
$ical .= "REFRESH-INTERVAL;VALUE=DURATION:PT12H\r\n";
$ical .= "X-PUBLISHED-TTL:PT12H\r\n";

$prayTime = new PrayTimes($method);
$prayTime->adjust(['asr' => $asr]);

$utc = new DateTimeZone('UTC');

while ($loop_date <= $loop_end) {
    $y = (int)$loop_date->format('Y');
    $m = (int)$loop_date->format('n');
    $d = (int)$loop_date->format('j');

    // Timezone offset for this specific day (seconds → hours), respects DST
    // Evaluate offset at 12:00:00 noon local time to avoid early-morning DST transition points
    $loop_noon = new DateTime($loop_date->format('Y-m-d') . ' 12:00:00', $timezone);
    $tz_offset_hours = $timezone->getOffset($loop_noon) / 3600;

    $times = $prayTime->getTimes($y, $m, $d, $lat, $lng, $tz_offset_hours, $elv);

    foreach ($selected_keys as $key) {
        $p          = $prayers_map[$key];
        $float_time = $times[$p['key']];

        if (!is_numeric($float_time) || is_nan((float)$float_time)) continue;

        // Build adhan DateTime in local timezone
        $total_minutes = (int)round((float)$float_time * 60);
        $adhan = new DateTime($loop_date->format('Y-m-d') . ' 00:00:00', $timezone);
        $adhan->modify("+{$total_minutes} minutes");

        // Filter: skip events outside the requested window
        if ($adhan < $range_start || $adhan > $range_end) continue;

        // Event window
        $ev_start = clone $adhan;
        if ($before > 0) $ev_start->modify("-{$before} minutes");

        $ev_end = clone $adhan;
        $ev_end->modify("+{$after} minutes");

        // Capture local adhan string
        $adhan_local = $adhan->format('H:i');

        // Convert to UTC for iCal timestamps
        $ev_start_utc = (clone $ev_start)->setTimezone($utc);
        $ev_end_utc   = (clone $ev_end)->setTimezone($utc);

        $dtstart = $ev_start_utc->format('Ymd\THis\Z');
        $dtend   = $ev_end_utc->format('Ymd\THis\Z');

        // Unique UID — deterministic
        $uid = md5("{$key}|{$loop_date->format('Ymd')}|{$lat}|{$lng}|{$method}")
             . '@salahcalendar.app';

        $summary = "{$p['en']} ({$p['ar']}) · {$adhan_local}";

        $desc_parts = ["Adhan: {$adhan_local} ({$tz_clean})"];
        if ($before > 0) $desc_parts[] = "{$before} min reminder before adhan";
        if ($after  > 0) $desc_parts[] = "{$after} min window after adhan";
        $desc_parts[] = "Method: {$method_label}";
        $desc = implode('\n', $desc_parts);

        $ical .= "BEGIN:VEVENT\r\n";
        $ical .= ical_fold("UID:{$uid}");
        $ical .= ical_fold("DTSTART:{$dtstart}");
        $ical .= ical_fold("DTEND:{$dtend}");
        $ical .= ical_fold("SUMMARY:" . ical_escape($summary));
        $ical .= ical_fold("DESCRIPTION:{$desc}");
        $ical .= "CATEGORIES:Prayer\r\n";
        $ical .= "STATUS:CONFIRMED\r\n";
        $ical .= "END:VEVENT\r\n";
    }

    $loop_date->modify('+1 day');
}

$ical .= "END:VCALENDAR\r\n";

// =====================================================================
//  Output
// =====================================================================
header('Content-Type: text/calendar; charset=utf-8');
header('Content-Disposition: inline; filename="prayer-times.ics"');
header('Cache-Control: no-cache, must-revalidate');
header('X-Content-Type-Options: nosniff');
echo $ical;
