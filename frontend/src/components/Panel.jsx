export default function Panel({ title, subtitle, action, children, className = '' }) {
  return <section className={`panel ${className}`}>
    {(title || action) && <div className="panel-heading"><div>{title && <h2>{title}</h2>}{subtitle && <p>{subtitle}</p>}</div>{action && <div className="panel-action">{action}</div>}</div>}
    {children}
  </section>;
}
