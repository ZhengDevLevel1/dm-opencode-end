import { CHINA_REGIONS, type RegionNode } from "./china-regions-data";

export interface RegionOption {
  value: string;
  label: string;
}

const MUNICIPALITIES = new Set(["北京市", "天津市", "上海市", "重庆市"]);
const MUNICIPALITY_GROUPS = new Set(["市辖区", "县"]);

const citiesByProvince = new Map<string, string[]>();
const districtsByCity = new Map<string, string[]>();
const directCountyByProvince = new Map<string, Map<string, string>>();
const cityOptionCache = new Map<string, readonly RegionOption[]>();
const districtOptionCache = new Map<string, readonly RegionOption[]>();
const EMPTY_OPTIONS: readonly RegionOption[] = [];

function cityKey(province: string, city: string) {
  return `${province}\u0000${city}`;
}

function toOptions(names: readonly string[]): readonly RegionOption[] {
  return names.map((name) => ({ value: name, label: name }));
}

for (const province of CHINA_REGIONS) {
  const cityNames: string[] = [];
  if (MUNICIPALITIES.has(province.name)) {
    const districts = new Set<string>();
    for (const group of province.children ?? []) {
      for (const district of group.children ?? []) {
        districts.add(district.name);
      }
    }
    cityNames.push(province.name);
    districtsByCity.set(cityKey(province.name, province.name), [...districts]);
  } else {
    for (const city of province.children ?? []) {
      cityNames.push(city.name);
      districtsByCity.set(cityKey(province.name, city.name), districtsOf(city));
      if (city.name.includes("直辖县级行政区划")) {
        let direct = directCountyByProvince.get(province.name);
        if (!direct) {
          direct = new Map();
          directCountyByProvince.set(province.name, direct);
        }
        for (const child of city.children ?? []) {
          direct.set(child.name, city.name);
        }
      }
    }
  }
  citiesByProvince.set(province.name, cityNames);
}

function districtsOf(node: RegionNode): string[] {
  return (node.children ?? []).map((child) => child.name);
}

export const PROVINCE_OPTIONS: readonly RegionOption[] = toOptions(
  CHINA_REGIONS.map((province) => province.name),
);

export function getCityOptions(
  province: string | undefined,
): readonly RegionOption[] {
  if (!province) {
    return EMPTY_OPTIONS;
  }
  const cached = cityOptionCache.get(province);
  if (cached) {
    return cached;
  }
  const options = toOptions(citiesByProvince.get(province) ?? []);
  cityOptionCache.set(province, options);
  return options;
}

export function getDistrictOptions(
  province: string | undefined,
  city: string | undefined,
): readonly RegionOption[] {
  if (!province || !city) {
    return EMPTY_OPTIONS;
  }
  const key = cityKey(province, city);
  const cached = districtOptionCache.get(key);
  if (cached) {
    return cached;
  }
  const options = toOptions(districtsByCity.get(key) ?? []);
  districtOptionCache.set(key, options);
  return options;
}

export function normalizeMunicipalityCity(
  province: string | undefined,
  city: string | undefined,
): string {
  if (!province || !city) {
    return city ?? "";
  }
  if (MUNICIPALITIES.has(province) && MUNICIPALITY_GROUPS.has(city)) {
    return province;
  }
  return city;
}

export function withCurrentOption(
  options: readonly RegionOption[],
  value: string | undefined,
): readonly RegionOption[] {
  const text = value?.trim();
  if (!text || options.some((option) => option.value === text)) {
    return options;
  }
  return [...options, { value: text, label: text }];
}

export interface RegionParts {
  province?: string;
  city?: string;
  district?: string;
}

export interface RegionPartsInput extends RegionParts {
  township?: string;
  formattedAddress?: string;
}

function textValue(value?: string): string | undefined {
  return value?.trim() || undefined;
}

function longestMatch(
  options: readonly string[],
  value: string | undefined,
): string | undefined {
  if (!value) {
    return undefined;
  }
  return options
    .filter((option) => value.includes(option))
    .sort((left, right) => right.length - left.length)[0];
}

function resolveDistrict(
  province: string,
  city: string,
  township: string | undefined,
  formattedAddress: string | undefined,
): string | undefined {
  const options = getDistrictOptions(province, city).map((option) => option.value);
  if (township && options.includes(township)) {
    return township;
  }
  return longestMatch(options, formattedAddress);
}

export function normalizeRegionParts(input: RegionPartsInput): RegionParts {
  let province = textValue(input.province);
  let city = textValue(input.city);
  let district = textValue(input.district);
  const township = textValue(input.township);
  const formattedAddress = textValue(input.formattedAddress);

  if (!province && formattedAddress) {
    province = longestMatch(
      CHINA_REGIONS.map((item) => item.name),
      formattedAddress,
    );
  }
  if (!province) {
    return { province, city, district };
  }

  if (MUNICIPALITIES.has(province)) {
    city = province;
    const resolved = district ?? resolveDistrict(province, city, township, formattedAddress);
    return { province, city, district: resolved };
  }

  const direct = directCountyByProvince.get(province);
  if (direct && city && direct.has(city)) {
    const county = city;
    return { province, city: direct.get(county), district: county };
  }
  if (
    direct &&
    district &&
    direct.has(district) &&
    (!city || city === province)
  ) {
    const county = district;
    return { province, city: direct.get(county), district: county };
  }
  if (direct && !city && !district && formattedAddress) {
    const county = longestMatch([...direct.keys()], formattedAddress);
    if (county) {
      return { province, city: direct.get(county), district: county };
    }
  }

  if (!city && formattedAddress) {
    city = longestMatch(citiesByProvince.get(province) ?? [], formattedAddress);
  }
  if (city && !district) {
    district = resolveDistrict(province, city, township, formattedAddress);
  }
  return { province, city, district };
}
