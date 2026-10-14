import { HacError, type DistrictId } from "./types";
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
/** Preflight only. No live HTTP transport exists. Future transport must also pin
 * resolved public IPs and reject redirects/rebinding, not merely trust this check. */
export function validateDestination(district: DistrictId, value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new HacError("DESTINATION", "Invalid district destination.");
  }
  if (
    url.protocol !== "https:" ||
    url.hostname !== districtConfig(district).host ||
    url.port ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    ![
      "/HomeAccess/Account/LogOn",
      "/HomeAccess/Content/Student/Assignments.aspx",
    ].includes(url.pathname)
  )
    throw new HacError(
      "DESTINATION",
      "Destination is not an approved district HTTPS endpoint.",
    );
  return url;
}
