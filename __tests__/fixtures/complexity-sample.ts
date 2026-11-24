export function complexFunction(x: number, y: number): number {

  if (x > 0 && y > 0) {
    return x + y;
  } else if (x < 0 || y < 0) {
    return x - y;
  } else {
    return 0;
  }
}

export function simpleFunction(a: number): number {
  return a * 2;
}
