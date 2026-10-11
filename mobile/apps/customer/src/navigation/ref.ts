// Shared navigation ref so components outside a navigator (header buttons,
// notification taps) can open root-level screens such as Language.
import { createNavigationContainerRef } from "@react-navigation/native";

export const navigationRef = createNavigationContainerRef();

export function navigateRoot(name: string, params?: object) {
  if (navigationRef.isReady()) (navigationRef.navigate as (n: string, p?: object) => void)(name, params);
}
