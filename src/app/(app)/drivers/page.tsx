import { getDrivers, getVehicles } from "@/lib/queries";
import { DriversView } from "@/components/drivers-view";

export const metadata = { title: "Drivers" };

export default async function DriversPage() {
  const [drivers, vehicles] = await Promise.all([getDrivers(), getVehicles()]);
  return <DriversView drivers={drivers} vehicles={vehicles} />;
}
