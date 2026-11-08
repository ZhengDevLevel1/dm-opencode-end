import { AppRoutes } from "@/app/router";
import { BloomTransitionProvider } from "@/components/domain/bloom-transition";

export function App() {
  return (
    <BloomTransitionProvider>
      <AppRoutes />
    </BloomTransitionProvider>
  );
}

export default App;
