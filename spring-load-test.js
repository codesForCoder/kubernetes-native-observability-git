import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  stages: [
    { duration: "60s", target: 50 },
    { duration: "120s", target: 100 },
    { duration: "120s", target: 200 },
    { duration: "60s", target: 0 },
  ],

  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<1000"],
  },
};

export default function () {
  const response = http.get("http://localhost:8081/api/books/1");

  check(response, {
    "status is 200": (r) => r.status === 200,
  });

  sleep(0.1);
}
