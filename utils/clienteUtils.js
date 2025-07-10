// utils/clienteUtils.js

export function obterNomeCliente(cliente) {
  if (!cliente) return '';

  if (cliente.name) return cliente.name;
  if (cliente.fullName) return cliente.fullName;

  // Verifica se há propriedades name.first e name.last
  if (cliente.name && typeof cliente.name === 'object') {
    const first = cliente.name.first || '';
    const last = cliente.name.last || '';
    return `${first} ${last}`.trim();
  }

  // Fallback caso nenhum campo acima exista
  return 'Cliente sem nome';
}
