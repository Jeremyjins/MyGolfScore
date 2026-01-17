import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
  // 루트: 로그인 체크 후 리다이렉트
  index("routes/_index.tsx"),

  // 로그인 (레이아웃 없음)
  route("login", "routes/login.tsx"),

  // 라운드 관련 (레이아웃 없음 - 전용 UI)
  route("round/new", "routes/round.new.tsx"),
  route("round/:id", "routes/round.$id.tsx"),

  // 메인 레이아웃 (Bottom Navigation 포함)
  layout("routes/_layout.tsx", [
    route("home", "routes/_layout.home.tsx"),
    route("history", "routes/_layout.history.tsx"),
    route("history/:id", "routes/_layout.history.$id.tsx"),
    route("stats", "routes/_layout.stats.tsx"),
    route("companions", "routes/_layout.companions.tsx"),
    route("companions/:id", "routes/_layout.companions.$id.tsx"),
    route("courses", "routes/_layout.courses.tsx"),
    route("settings", "routes/_layout.settings.tsx"),
  ]),
] satisfies RouteConfig;
