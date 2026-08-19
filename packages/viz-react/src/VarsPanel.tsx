export function VarsPanel({ vars }: { vars?: Record<string, string | number> }) {
  const entries = Object.entries(vars ?? {});
  if (entries.length === 0) return null;
  return (
    <table className="vars-panel">
      <caption className="visually-hidden">Current variables</caption>
      <tbody>
        {entries.map(([name, value]) => (
          <tr key={name}>
            <th scope="row">{name}</th>
            <td>{value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
