<?php
/**
 * prayer.php — Prayer Times iCalendar Feed
 * Deploy to: prayer.hablullah.app/prayer.php
 *
 * Query parameters:
 *   lat          float     required  Latitude  (-90  to  90)
 *   lng          float     required  Longitude (-180 to 180)
 *   method       int 0–7   default 3 Calculation method
 *                                     0=Jafari  1=Karachi  2=ISNA  3=MWL
 *                                     4=Makkah  5=Egypt    6=Custom 7=Tehran
 *   asr          int 0–1   default 0 Asr juristic: 0=Shafii, 1=Hanafi
 *   before       int       default 0  Minutes before adhan (rounded to 15)
 *   after        int       default 30 Minutes after adhan  (rounded to 15)
 *   hours_before int       default 0   Hours before now to include
 *   hours_after  int       default 720 Hours after  now to include (30 days)
 *   tz           string    default UTC IANA timezone e.g. Europe/London
 *   prayers      string    default fajr,dhuhr,asr,maghrib,isha
 *   location     string    default ""  Location label for calendar name
 *
 * Example:
 *   prayer.php?lat=51.5074&lng=-0.1278&method=3&tz=Europe%2FLondon&before=15&after=30
 */

// =====================================================================
//  EMBEDDED PrayTime class  (v1.2.2)
//  © 2007-2010 PrayTimes.org — Hamid Zarrabi-Zadeh — GNU LGPL v3
//  Source: https://github.com/abodehq/Pray-Times/blob/master/Code/v2/php/PrayTime.php
// =====================================================================
class PrayTime
{
    // Calculation methods
    var $Jafari  = 0;
    var $Karachi = 1;
    var $ISNA    = 2;
    var $MWL     = 3;
    var $Makkah  = 4;
    var $Egypt   = 5;
    var $Custom  = 6;
    var $Tehran  = 7;

    // Juristic methods
    var $Shafii = 0;
    var $Hanafi = 1;

    // High-lat adjustment methods
    var $None        = 0;
    var $MidNight    = 1;
    var $OneSeventh  = 2;
    var $AngleBased  = 3;

    // Time formats
    var $Time24   = 0;
    var $Time12   = 1;
    var $Time12NS = 2;
    var $Float    = 3;

    var $timeNames   = ['Fajr','Sunrise','Dhuhr','Asr','Sunset','Maghrib','Isha'];
    var $InvalidTime = '-----';

    var $calcMethod    = 0;
    var $asrJuristic   = 0;
    var $dhuhrMinutes  = 0;
    var $adjustHighLats = 1;
    var $timeFormat    = 0;
    var $lat;
    var $lng;
    var $timeZone;
    var $JDate;
    var $numIterations = 1;
    var $methodParams  = [];

    function __construct($methodID = 0)
    {
        $this->methodParams[$this->Jafari]  = [16,   0, 4,   0, 14  ];
        $this->methodParams[$this->Karachi] = [18,   1, 0,   0, 18  ];
        $this->methodParams[$this->ISNA]    = [15,   1, 0,   0, 15  ];
        $this->methodParams[$this->MWL]     = [18,   1, 0,   0, 17  ];
        $this->methodParams[$this->Makkah]  = [18.5, 1, 0,   1, 90  ];
        $this->methodParams[$this->Egypt]   = [19.5, 1, 0,   0, 17.5];
        $this->methodParams[$this->Tehran]  = [17.7, 0, 4.5, 0, 14  ];
        $this->methodParams[$this->Custom]  = [18,   1, 0,   0, 17  ];
        $this->setCalcMethod($methodID);
    }

    function getDatePrayerTimes($year, $month, $day, $latitude, $longitude, $timeZone)
    {
        $this->lat      = $latitude;
        $this->lng      = $longitude;
        $this->timeZone = $timeZone;
        $this->JDate    = $this->julianDate($year, $month, $day) - $longitude / (15 * 24);
        return $this->computeDayTimes();
    }

    function getPrayerTimes($timestamp, $latitude, $longitude, $timeZone)
    {
        $date = getdate($timestamp);
        return $this->getDatePrayerTimes($date['year'], $date['mon'], $date['mday'],
                                         $latitude, $longitude, $timeZone);
    }

    function setCalcMethod($methodID)   { $this->calcMethod   = $methodID; }
    function setAsrMethod($methodID)    { if ($methodID >= 0 && $methodID <= 1) $this->asrJuristic = $methodID; }
    function setFajrAngle($angle)       { $this->setCustomParams([$angle, null, null, null, null]); }
    function setMaghribAngle($angle)    { $this->setCustomParams([null, 0, $angle, null, null]); }
    function setIshaAngle($angle)       { $this->setCustomParams([null, null, null, 0, $angle]); }
    function setDhuhrMinutes($minutes)  { $this->dhuhrMinutes = $minutes; }
    function setMaghribMinutes($minutes){ $this->setCustomParams([null, 1, $minutes, null, null]); }
    function setIshaMinutes($minutes)   { $this->setCustomParams([null, null, null, 1, $minutes]); }

    function setCustomParams($params)
    {
        for ($i = 0; $i < 5; $i++) {
            $this->methodParams[$this->Custom][$i] = ($params[$i] === null)
                ? $this->methodParams[$this->calcMethod][$i]
                : $params[$i];
        }
        $this->calcMethod = $this->Custom;
    }

    function setHighLatsMethod($methodID) { $this->adjustHighLats = $methodID; }
    function setTimeFormat($timeFormat)   { $this->timeFormat     = $timeFormat; }

    function floatToTime24($time)
    {
        if (is_nan($time)) return $this->InvalidTime;
        $time    = $this->fixhour($time + 0.5 / 60);
        $hours   = floor($time);
        $minutes = floor(($time - $hours) * 60);
        return $this->twoDigitsFormat($hours) . ':' . $this->twoDigitsFormat($minutes);
    }

    function floatToTime12($time, $noSuffix = false)
    {
        if (is_nan($time)) return $this->InvalidTime;
        $time    = $this->fixhour($time + 0.5 / 60);
        $hours   = floor($time);
        $minutes = floor(($time - $hours) * 60);
        $suffix  = $hours >= 12 ? ' pm' : ' am';
        $hours   = ($hours + 12 - 1) % 12 + 1;
        return $hours . ':' . $this->twoDigitsFormat($minutes) . ($noSuffix ? '' : $suffix);
    }

    function floatToTime12NS($time) { return $this->floatToTime12($time, true); }

    // --- Calculation ---
    function sunPosition($jd)
    {
        $D  = $jd - 2451545.0;
        $g  = $this->fixangle(357.529 + 0.98560028 * $D);
        $q  = $this->fixangle(280.459 + 0.98564736 * $D);
        $L  = $this->fixangle($q + 1.915 * $this->dsin($g) + 0.020 * $this->dsin(2 * $g));
        $e  = 23.439 - 0.00000036 * $D;
        $d  = $this->darcsin($this->dsin($e) * $this->dsin($L));
        $RA = $this->darctan2($this->dcos($e) * $this->dsin($L), $this->dcos($L)) / 15;
        $RA = $this->fixhour($RA);
        return [$d, $q / 15 - $RA];
    }

    function equationOfTime($jd) { return $this->sunPosition($jd)[1]; }
    function sunDeclination($jd) { return $this->sunPosition($jd)[0]; }

    function computeMidDay($t)
    {
        return $this->fixhour(12 - $this->equationOfTime($this->JDate + $t));
    }

    function computeTime($G, $t)
    {
        $D = $this->sunDeclination($this->JDate + $t);
        $Z = $this->computeMidDay($t);
        $V = 1 / 15 * $this->darccos(
            (-$this->dsin($G) - $this->dsin($D) * $this->dsin($this->lat)) /
            ($this->dcos($D) * $this->dcos($this->lat))
        );
        return $Z + ($G > 90 ? -$V : $V);
    }

    function computeAsr($step, $t)
    {
        $D = $this->sunDeclination($this->JDate + $t);
        $G = -$this->darccot($step + $this->dtan(abs($this->lat - $D)));
        return $this->computeTime($G, $t);
    }

    function computeTimes($times)
    {
        $t       = $this->dayPortion($times);
        $Fajr    = $this->computeTime(180 - $this->methodParams[$this->calcMethod][0], $t[0]);
        $Sunrise = $this->computeTime(180 - 0.833, $t[1]);
        $Dhuhr   = $this->computeMidDay($t[2]);
        $Asr     = $this->computeAsr(1 + $this->asrJuristic, $t[3]);
        $Sunset  = $this->computeTime(0.833, $t[4]);
        $Maghrib = $this->computeTime($this->methodParams[$this->calcMethod][2], $t[5]);
        $Isha    = $this->computeTime($this->methodParams[$this->calcMethod][4], $t[6]);
        return [$Fajr, $Sunrise, $Dhuhr, $Asr, $Sunset, $Maghrib, $Isha];
    }

    function computeDayTimes()
    {
        $times = [5, 6, 12, 13, 18, 18, 18];
        for ($i = 1; $i <= $this->numIterations; $i++) {
            $times = $this->computeTimes($times);
        }
        $times = $this->adjustTimes($times);
        return $this->adjustTimesFormat($times);
    }

    function adjustTimes($times)
    {
        for ($i = 0; $i < 7; $i++) {
            $times[$i] += $this->timeZone - $this->lng / 15;
        }
        $times[2] += $this->dhuhrMinutes / 60;
        if ($this->methodParams[$this->calcMethod][1] == 1) {
            $times[5] = $times[4] + $this->methodParams[$this->calcMethod][2] / 60;
        }
        if ($this->methodParams[$this->calcMethod][3] == 1) {
            $times[6] = $times[5] + $this->methodParams[$this->calcMethod][4] / 60;
        }
        if ($this->adjustHighLats != $this->None) {
            $times = $this->adjustHighLatTimes($times);
        }
        return $times;
    }

    function adjustTimesFormat($times)
    {
        if ($this->timeFormat == $this->Float) return $times;
        for ($i = 0; $i < 7; $i++) {
            if ($this->timeFormat == $this->Time12)
                $times[$i] = $this->floatToTime12($times[$i]);
            elseif ($this->timeFormat == $this->Time12NS)
                $times[$i] = $this->floatToTime12($times[$i], true);
            else
                $times[$i] = $this->floatToTime24($times[$i]);
        }
        return $times;
    }

    function adjustHighLatTimes($times)
    {
        $nightTime = $this->timeDiff($times[4], $times[1]);
        $FajrDiff  = $this->nightPortion($this->methodParams[$this->calcMethod][0]) * $nightTime;
        if (is_nan($times[0]) || $this->timeDiff($times[0], $times[1]) > $FajrDiff)
            $times[0] = $times[1] - $FajrDiff;
        $IshaAngle = ($this->methodParams[$this->calcMethod][3] == 0)
            ? $this->methodParams[$this->calcMethod][4] : 18;
        $IshaDiff = $this->nightPortion($IshaAngle) * $nightTime;
        if (is_nan($times[6]) || $this->timeDiff($times[4], $times[6]) > $IshaDiff)
            $times[6] = $times[4] + $IshaDiff;
        $MaghribAngle = ($this->methodParams[$this->calcMethod][1] == 0)
            ? $this->methodParams[$this->calcMethod][2] : 4;
        $MaghribDiff = $this->nightPortion($MaghribAngle) * $nightTime;
        if (is_nan($times[5]) || $this->timeDiff($times[4], $times[5]) > $MaghribDiff)
            $times[5] = $times[4] + $MaghribDiff;
        return $times;
    }

    function nightPortion($angle)
    {
        if ($this->adjustHighLats == $this->AngleBased) return 1 / 60 * $angle;
        if ($this->adjustHighLats == $this->MidNight)   return 1 / 2;
        if ($this->adjustHighLats == $this->OneSeventh) return 1 / 7;
        return 0;
    }

    function dayPortion($times)
    {
        for ($i = 0; $i < 7; $i++) $times[$i] /= 24;
        return $times;
    }

    function timeDiff($t1, $t2) { return $this->fixhour($t2 - $t1); }

    function twoDigitsFormat($n) { return ($n < 10) ? '0' . $n : $n; }

    function julianDate($year, $month, $day)
    {
        if ($month <= 2) { $year -= 1; $month += 12; }
        $A  = floor($year / 100);
        $B  = 2 - $A + floor($A / 4);
        return floor(365.25 * ($year + 4716)) + floor(30.6001 * ($month + 1)) + $day + $B - 1524.5;
    }

    function dsin($d)  { return sin($this->dtr($d)); }
    function dcos($d)  { return cos($this->dtr($d)); }
    function dtan($d)  { return tan($this->dtr($d)); }
    function darcsin($x) { return $this->rtd(asin($x)); }
    function darccos($x) { return $this->rtd(acos($x)); }
    function darctan($x) { return $this->rtd(atan($x)); }
    function darctan2($y,$x) { return $this->rtd(atan2($y, $x)); }
    function darccot($x) { return $this->rtd(atan(1 / $x)); }
    function dtr($d)   { return ($d * M_PI) / 180.0; }
    function rtd($r)   { return ($r * 180.0) / M_PI; }

    function fixangle($a)
    {
        $a = $a - 360.0 * floor($a / 360.0);
        return $a < 0 ? $a + 360.0 : $a;
    }

    function fixhour($a)
    {
        $a = $a - 24.0 * floor($a / 24.0);
        return $a < 0 ? $a + 24.0 : $a;
    }
}
// =====================================================================
//  END PrayTime class
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
        $bytes = strlen($ch); // UTF-8 byte width
        if ($col + $bytes > 75) {
            $result .= "\r\n ";
            $col = 1; // space continuation
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

// =====================================================================
//  Parse & validate inputs
// =====================================================================
$lat          = get_float('lat');
$lng          = get_float('lng');
$method       = get_int('method',       3, 0, 7);
$asr          = get_int('asr',          0, 0, 1);
$before_raw   = get_int('before',       0, 0, 180);
$after_raw    = get_int('after',       30, 0, 180);
$hours_before = get_int('hours_before', 0, 0, 8760);   // max 1 year back
$hours_after  = get_int('hours_after', 720, 1, 17520); // max 2 years forward
$tz_raw       = get_str('tz', 'UTC', 64);
$prayers_raw  = get_str('prayers', 'fajr,dhuhr,asr,maghrib,isha', 100);
$location_raw = get_str('location', '', 100);

// Round before/after to nearest 5 min
$before = (int)(round($before_raw / 5) * 5);
$after  = (int)(round($after_raw  / 5) * 5);

// Enforce minimum 5-min event window
if ($before === 0 && $after === 0) $after = 5;

// Error response helper
function abort(int $code, string $msg): void
{
    http_response_code($code);
    header('Content-Type: text/plain; charset=utf-8');
    echo $msg . "\n";
    exit;
}

if ($lat === null || $lng === null) {
    abort(400, "Missing required parameters: 'lat' and 'lng'.\n"
             . "Example: prayer.php?lat=51.5074&lng=-0.1278&method=3&tz=Europe%2FLondon");
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

// Prayer index map
$prayers_map = [
    'fajr'    => ['idx' => 0, 'en' => 'Fajr',    'ar' => 'الفجر'],
    'sunrise' => ['idx' => 1, 'en' => 'Sunrise',  'ar' => 'الشروق'],
    'dhuhr'   => ['idx' => 2, 'en' => 'Dhuhr',    'ar' => 'الظهر'],
    'asr'     => ['idx' => 3, 'en' => 'Asr',      'ar' => 'العصر'],
    'sunset'  => ['idx' => 4, 'en' => 'Sunset',   'ar' => 'الغروب'],
    'maghrib' => ['idx' => 5, 'en' => 'Maghrib',  'ar' => 'المغرب'],
    'isha'    => ['idx' => 6, 'en' => 'Isha',     'ar' => 'العشاء'],
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

// Loop from the calendar day of range_start through range_end
$loop_date = new DateTime($range_start->format('Y-m-d') . ' 00:00:00', $timezone);
$loop_end  = new DateTime($range_end->format('Y-m-d')   . ' 00:00:00', $timezone);

// =====================================================================
//  Build iCal
// =====================================================================
$method_names = [
    0 => 'Jafari', 1 => 'Karachi', 2 => 'ISNA', 3 => 'MWL',
    4 => 'Makkah', 5 => 'Egypt',   6 => 'Custom', 7 => 'Tehran',
];
$method_label = $method_names[$method] ?? "Method {$method}";
$location_label = $location_raw ?: "{$lat}, {$lng}";

$cal_name = "Prayer Times · {$method_label}";
$cal_desc = "Prayer times for {$location_label} | Method: {$method_label} | Timezone: {$tz_clean}";

$ical  = "BEGIN:VCALENDAR\r\n";
$ical .= "VERSION:2.0\r\n";
$ical .= ical_fold("PRODID:-//Hablullah//Prayer Times Calendar 1.0//EN");
$ical .= "CALSCALE:GREGORIAN\r\n";
$ical .= "METHOD:PUBLISH\r\n";
$ical .= ical_fold("X-WR-CALNAME:" . ical_escape($cal_name));
$ical .= ical_fold("X-WR-CALDESC:" . ical_escape($cal_desc));
$ical .= "REFRESH-INTERVAL;VALUE=DURATION:PT12H\r\n";
$ical .= "X-PUBLISHED-TTL:PT12H\r\n";

$prayTime = new PrayTime($method);
$prayTime->setAsrMethod($asr);
$prayTime->setTimeFormat(3); // Float output

$utc = new DateTimeZone('UTC');

while ($loop_date <= $loop_end) {
    $y = (int)$loop_date->format('Y');
    $m = (int)$loop_date->format('n');
    $d = (int)$loop_date->format('j');

    // Timezone offset for this specific day (seconds → hours), respects DST
    $tz_offset_hours = $timezone->getOffset($loop_date) / 3600;

    $times = $prayTime->getDatePrayerTimes($y, $m, $d, $lat, $lng, $tz_offset_hours);

    foreach ($selected_keys as $key) {
        $p          = $prayers_map[$key];
        $float_time = $times[$p['idx']];

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

        // Capture local adhan string before converting timezone
        $adhan_local = $adhan->format('H:i');

        // Convert to UTC for iCal timestamps
        $ev_start_utc = (clone $ev_start)->setTimezone($utc);
        $ev_end_utc   = (clone $ev_end)->setTimezone($utc);

        $dtstart = $ev_start_utc->format('Ymd\THis\Z');
        $dtend   = $ev_end_utc->format('Ymd\THis\Z');

        // Unique UID — deterministic so re-importing doesn't duplicate
        $uid = md5("{$key}|{$loop_date->format('Ymd')}|{$lat}|{$lng}|{$method}")
             . '@prayer.hablullah.app';

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
