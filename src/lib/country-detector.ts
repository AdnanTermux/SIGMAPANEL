/**
 * Country detection from phone number prefixes
 * Supports 30+ country codes with longest prefix matching
 */

interface CountryInfo {
  code: string;
  name: string;
  prefix: string;
}

const COUNTRY_PREFIXES: CountryInfo[] = [
  // Sorted by prefix length descending for longest match first
  // 4-digit
  { code: 'SX', name: 'Sint Maarten', prefix: '1721' },
  { code: 'AG', name: 'Antigua and Barbuda', prefix: '1268' },
  { code: 'BB', name: 'Barbados', prefix: '1246' },
  { code: 'BS', name: 'Bahamas', prefix: '1242' },
  { code: 'DM', name: 'Dominica', prefix: '1767' },
  { code: 'DO', name: 'Dominican Republic', prefix: '1809' },
  { code: 'DO', name: 'Dominican Republic', prefix: '1829' },
  { code: 'DO', name: 'Dominican Republic', prefix: '1849' },
  { code: 'GD', name: 'Grenada', prefix: '1473' },
  { code: 'JM', name: 'Jamaica', prefix: '1876' },
  { code: 'KN', name: 'Saint Kitts and Nevis', prefix: '1869' },
  { code: 'KY', name: 'Cayman Islands', prefix: '1345' },
  { code: 'LC', name: 'Saint Lucia', prefix: '1758' },
  { code: 'TC', name: 'Turks and Caicos', prefix: '1649' },
  { code: 'TT', name: 'Trinidad and Tobago', prefix: '1868' },
  { code: 'VC', name: 'Saint Vincent', prefix: '1784' },
  { code: 'VG', name: 'British Virgin Islands', prefix: '1284' },
  { code: 'VI', name: 'US Virgin Islands', prefix: '1340' },
  // 3-digit
  { code: 'ARE', name: 'UAE', prefix: '971' },
  { code: 'BHR', name: 'Bahrain', prefix: '973' },
  { code: 'BGD', name: 'Bangladesh', prefix: '880' },
  { code: 'BTN', name: 'Bhutan', prefix: '975' },
  { code: 'KHM', name: 'Cambodia', prefix: '855' },
  { code: 'CMR', name: 'Cameroon', prefix: '237' },
  { code: 'CYP', name: 'Cyprus', prefix: '357' },
  { code: 'GEO', name: 'Georgia', prefix: '995' },
  { code: 'ISR', name: 'Israel', prefix: '972' },
  { code: 'JOR', name: 'Jordan', prefix: '962' },
  { code: 'KWT', name: 'Kuwait', prefix: '965' },
  { code: 'LBN', name: 'Lebanon', prefix: '961' },
  { code: 'MDV', name: 'Maldives', prefix: '960' },
  { code: 'MUS', name: 'Mauritius', prefix: '230' },
  { code: 'MNE', name: 'Montenegro', prefix: '382' },
  { code: 'MWI', name: 'Malawi', prefix: '265' },
  { code: 'NPL', name: 'Nepal', prefix: '977' },
  { code: 'OMN', name: 'Oman', prefix: '968' },
  { code: 'PAN', name: 'Panama', prefix: '507' },
  { code: 'PRI', name: 'Puerto Rico', prefix: '1787' },
  { code: 'PRI', name: 'Puerto Rico', prefix: '1939' },
  { code: 'QAT', name: 'Qatar', prefix: '974' },
  { code: 'RWA', name: 'Rwanda', prefix: '250' },
  { code: 'SUR', name: 'Suriname', prefix: '597' },
  { code: 'TJK', name: 'Tajikistan', prefix: '992' },
  { code: 'UZB', name: 'Uzbekistan', prefix: '998' },
  // 2-digit
  { code: 'CN', name: 'China', prefix: '86' },
  { code: 'IN', name: 'India', prefix: '91' },
  { code: 'ID', name: 'Indonesia', prefix: '62' },
  { code: 'JP', name: 'Japan', prefix: '81' },
  { code: 'KR', name: 'South Korea', prefix: '82' },
  { code: 'MX', name: 'Mexico', prefix: '52' },
  { code: 'PH', name: 'Philippines', prefix: '63' },
  { code: 'NG', name: 'Nigeria', prefix: '234' },
  { code: 'EG', name: 'Egypt', prefix: '20' },
  { code: 'ZA', name: 'South Africa', prefix: '27' },
  { code: 'CO', name: 'Colombia', prefix: '57' },
  { code: 'PE', name: 'Peru', prefix: '51' },
  { code: 'AR', name: 'Argentina', prefix: '54' },
  { code: 'CL', name: 'Chile', prefix: '56' },
  { code: 'VE', name: 'Venezuela', prefix: '58' },
  { code: 'PK', name: 'Pakistan', prefix: '92' },
  { code: 'BD', name: 'Bangladesh', prefix: '880' },
  { code: 'TH', name: 'Thailand', prefix: '66' },
  { code: 'VN', name: 'Vietnam', prefix: '84' },
  { code: 'MY', name: 'Malaysia', prefix: '60' },
  { code: 'SA', name: 'Saudi Arabia', prefix: '966' },
  { code: 'AE', name: 'UAE', prefix: '971' },
  { code: 'TR', name: 'Turkey', prefix: '90' },
  { code: 'UA', name: 'Ukraine', prefix: '380' },
  { code: 'RO', name: 'Romania', prefix: '40' },
  { code: 'CZ', name: 'Czech Republic', prefix: '420' },
  { code: 'HU', name: 'Hungary', prefix: '36' },
  { code: 'PL', name: 'Poland', prefix: '48' },
  { code: 'GR', name: 'Greece', prefix: '30' },
  { code: 'PT', name: 'Portugal', prefix: '351' },
  { code: 'SE', name: 'Sweden', prefix: '46' },
  { code: 'NO', name: 'Norway', prefix: '47' },
  { code: 'DK', name: 'Denmark', prefix: '45' },
  { code: 'FI', name: 'Finland', prefix: '358' },
  { code: 'IE', name: 'Ireland', prefix: '353' },
  { code: 'BE', name: 'Belgium', prefix: '32' },
  { code: 'NL', name: 'Netherlands', prefix: '31' },
  { code: 'CH', name: 'Switzerland', prefix: '41' },
  { code: 'AT', name: 'Austria', prefix: '43' },
  { code: 'RU', name: 'Russia', prefix: '7' },
  { code: 'GB', name: 'United Kingdom', prefix: '44' },
  { code: 'FR', name: 'France', prefix: '33' },
  { code: 'ES', name: 'Spain', prefix: '34' },
  { code: 'DE', name: 'Germany', prefix: '49' },
  { code: 'IT', name: 'Italy', prefix: '39' },
  { code: 'AU', name: 'Australia', prefix: '61' },
  { code: 'NZ', name: 'New Zealand', prefix: '64' },
  { code: 'CA', name: 'Canada', prefix: '1' },
  { code: 'US', name: 'United States', prefix: '1' },
  { code: 'TW', name: 'Taiwan', prefix: '886' },
  { code: 'HK', name: 'Hong Kong', prefix: '852' },
  { code: 'MO', name: 'Macau', prefix: '853' },
  { code: 'SG', name: 'Singapore', prefix: '65' },
  { code: 'LK', name: 'Sri Lanka', prefix: '94' },
  { code: 'MM', name: 'Myanmar', prefix: '95' },
  { code: 'KH', name: 'Cambodia', prefix: '855' },
  { code: 'LA', name: 'Laos', prefix: '856' },
  { code: 'BN', name: 'Brunei', prefix: '673' },
  { code: 'PG', name: 'Papua New Guinea', prefix: '675' },
  { code: 'FJ', name: 'Fiji', prefix: '679' },
  { code: 'LR', name: 'Liberia', prefix: '231' },
  { code: 'SN', name: 'Senegal', prefix: '221' },
  { code: 'ML', name: 'Mali', prefix: '223' },
  { code: 'GN', name: 'Guinea', prefix: '224' },
  { code: 'CI', name: 'Ivory Coast', prefix: '225' },
  { code: 'BF', name: 'Burkina Faso', prefix: '226' },
  { code: 'NE', name: 'Niger', prefix: '227' },
  { code: 'TG', name: 'Togo', prefix: '228' },
  { code: 'BJ', name: 'Benin', prefix: '229' },
  { code: 'MR', name: 'Mauritania', prefix: '222' },
  { code: 'LR', name: 'Liberia', prefix: '231' },
  { code: 'SL', name: 'Sierra Leone', prefix: '232' },
  { code: 'GH', name: 'Ghana', prefix: '233' },
  { code: 'KE', name: 'Kenya', prefix: '254' },
  { code: 'TZ', name: 'Tanzania', prefix: '255' },
  { code: 'UG', name: 'Uganda', prefix: '256' },
  { code: 'ET', name: 'Ethiopia', prefix: '251' },
  { code: 'SO', name: 'Somalia', prefix: '252' },
  { code: 'DZ', name: 'Algeria', prefix: '213' },
  { code: 'TN', name: 'Tunisia', prefix: '216' },
  { code: 'LY', name: 'Libya', prefix: '218' },
  { code: 'GM', name: 'Gambia', prefix: '220' },
  { code: 'GW', name: 'Guinea-Bissau', prefix: '245' },
  { code: 'CV', name: 'Cape Verde', prefix: '238' },
  { code: 'ST', name: 'Sao Tome', prefix: '239' },
  { code: 'CF', name: 'Central African Republic', prefix: '236' },
  { code: 'TD', name: 'Chad', prefix: '235' },
  { code: 'CG', name: 'Congo', prefix: '242' },
  { code: 'CD', name: 'DR Congo', prefix: '243' },
  { code: 'AO', name: 'Angola', prefix: '244' },
  { code: 'GA', name: 'Gabon', prefix: '241' },
  { code: 'GQ', name: 'Equatorial Guinea', prefix: '240' },
  { code: 'SC', name: 'Seychelles', prefix: '248' },
  { code: 'SD', name: 'Sudan', prefix: '249' },
  { code: 'RW', name: 'Rwanda', prefix: '250' },
  { code: 'KM', name: 'Comoros', prefix: '269' },
  { code: 'ZA', name: 'South Africa', prefix: '27' },
  { code: 'SH', name: 'Saint Helena', prefix: '290' },
  { code: 'ER', name: 'Eritrea', prefix: '291' },
  { code: 'SZ', name: 'Eswatini', prefix: '268' },
  { code: 'MG', name: 'Madagascar', prefix: '261' },
  { code: 'YT', name: 'Mayotte', prefix: '262' },
  { code: 'ZW', name: 'Zimbabwe', prefix: '263' },
  { code: 'NA', name: 'Namibia', prefix: '264' },
  { code: 'MZ', name: 'Mozambique', prefix: '258' },
  { code: 'MW', name: 'Malawi', prefix: '265' },
  { code: 'LS', name: 'Lesotho', prefix: '266' },
  { code: 'BW', name: 'Botswana', prefix: '267' },
  { code: 'ZM', name: 'Zambia', prefix: '260' },
];

// Sort by prefix length descending for longest match
const SORTED_PREFIXES = [...COUNTRY_PREFIXES].sort(
  (a, b) => b.prefix.length - a.prefix.length
);

// Build a map for 1-digit prefix (US/Canada) disambiguation
const NORTH_AMERICAN_AREA_CODES: Set<string> = new Set([
  '202', '212', '213', '305', '310', '312', '323', '347', '415', '416',
  '510', '512', '514', '604', '617', '646', '647', '650', '669', '702',
  '713', '718', '720', '778', '808', '818', '832', '856', '867', '909',
  '905', '917', '949', '951', '972',
]);

/**
 * Detect country from a phone number
 * @param phoneNumber - E.164 format or raw phone number
 * @returns { code, name } or null
 */
export function detectCountry(
  phoneNumber: string
): { code: string; name: string } | null {
  if (!phoneNumber) return null;

  // Strip to digits only
  const digits = phoneNumber.replace(/[^\d]/g, '');
  if (!digits || digits.length < 4) return null;

  // Try longest prefix match first
  for (const country of SORTED_PREFIXES) {
    if (digits.startsWith(country.prefix)) {
      // Special handling for US/Canada (both use +1)
      if (country.prefix === '1' && digits.length >= 4) {
        const areaCode = digits.substring(1, 4);
        if (NORTH_AMERICAN_AREA_CODES.has(areaCode)) {
          return { code: 'US', name: 'United States' };
        }
        if (areaCode.startsWith('6') || areaCode.startsWith('7') || areaCode.startsWith('8')) {
          return { code: 'CA', name: 'Canada' };
        }
        return { code: 'US', name: 'United States' };
      }
      return { code: country.code, name: country.name };
    }
  }

  return null;
}
