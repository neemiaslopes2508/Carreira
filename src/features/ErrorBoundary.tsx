import { Component, type ReactNode } from "react";
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed)
      return (
        <main className="loading">
          <h1>Não foi possível carregar a aplicação</h1>
          <p>
            Recarregue a página para tentar novamente. Seus registros não foram apagados.
          </p>
          <p>
            Se o problema persistir, abra o endereço no navegador em que os
            registros foram criados e confira se ele permite armazenamento local.
          </p>
          <button onClick={() => location.reload()}>Tentar novamente</button>
        </main>
      );
    return this.props.children;
  }
}
