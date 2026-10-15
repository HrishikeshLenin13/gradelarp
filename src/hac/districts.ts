import { type DistrictId } from "./types";
export const districts = [
  {
    id: "lisd",
    name: "Leander ISD",
    short: "LISD",
    host: "lis-hac.eschoolplus.powerschool.com",
    source: "https://www.leanderisd.org/homeaccesscenter/",
  },
  {
    id: "rrisd",
    name: "Round Rock ISD",
    short: "RRISD",
    host: "accesscenter.roundrockisd.org",
    source: "https://www.roundrockisd.org/o/rrisd/page/home-access-center",
  },
] as const;
export function districtConfig(id: DistrictId) {
  return districts.find((d) => d.id === id)!;
}
