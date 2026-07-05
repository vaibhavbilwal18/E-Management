import { Provider } from "react-redux";
import { Toaster } from "react-hot-toast";
import { store } from "@/redux/store";
import { AppRouter } from "@/routes/AppRouter";
import { FullScreenSpinner } from "@/components/common/FullScreenSpinner";
import { useAuthBootstrap } from "@/hooks/useAuthBootstrap";
import { useNotificationSocket } from "@/hooks/useNotificationSocket";

function AppShell() {
  const isInitialized = useAuthBootstrap();
  useNotificationSocket();

  if (!isInitialized) {
    return <FullScreenSpinner />;
  }

  return <AppRouter />;
}

function App() {
  return (
    <Provider store={store}>
      <AppShell />
      <Toaster position="top-right" />
    </Provider>
  );
}

export default App;
