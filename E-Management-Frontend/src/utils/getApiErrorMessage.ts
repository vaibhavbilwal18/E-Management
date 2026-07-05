interface ApiErrorShape {
  message: string;
}

function isApiErrorShape(error: unknown): error is ApiErrorShape {
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as ApiErrorShape).message === "string"
  );
}

export function getApiErrorMessage(error: unknown, fallback = "Something went wrong"): string {
  return isApiErrorShape(error) ? error.message : fallback;
}
