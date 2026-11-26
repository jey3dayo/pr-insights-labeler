export function Badge(props: { count: number }) {
  if (props.count > 0) {
    return <span>{props.count}</span>;
  }

  return <span>0</span>;
}
