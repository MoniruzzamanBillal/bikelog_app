import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "lastUsedBikeId";

export async function setLastUsedBike(bikeId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, bikeId);
  } catch {
    /* best-effort */
  }
}

export async function getLastUsedBike(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(KEY);
  } catch {
    return null;
  }
}

/**
 * Resolution order for "the" bike when a screen/widget needs one and none was
 * passed explicitly: exactly one bike -> use it; otherwise a still-existing
 * stored last-used bike -> use it; otherwise null (caller routes to the bike
 * list rather than guess wrong).
 */
export async function resolveBikeId(
  bikes: { _id: string }[],
): Promise<string | null> {
  if (bikes.length === 1) return bikes[0]._id;
  const stored = await getLastUsedBike();
  if (stored && bikes.some((b) => b._id === stored)) return stored;
  return null;
}
