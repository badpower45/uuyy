import { createBrowserRouter } from "react-router";
import LoginPage          from "./components/LoginPage";
import AdminDashboard     from "./components/AdminDashboard";
import RestaurantPortal   from "./components/RestaurantPortal";
import DispatcherDashboard from "./components/DispatcherDashboard";
import DriverTracker      from "./components/DriverTracker";

export const router = createBrowserRouter([
  { path: "/",           Component: LoginPage },
  { path: "/admin",      Component: AdminDashboard },
  { path: "/restaurant", Component: RestaurantPortal },
  { path: "/dispatcher", Component: DispatcherDashboard },
  { path: "/driver",     Component: DriverTracker },
]);
