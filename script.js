let ordenSeleccionadaId = null;

const ordenForm = document.getElementById('orden-form');
const detalleForm = document.getElementById('detalle-form');
const tablaOrdenes = document.getElementById('tabla-ordenes');
const tablaDetalles = document.getElementById('tabla-detalles');

document.addEventListener('DOMContentLoaded', cargarOrdenes);

// CONSULTA MAESTRO
async function cargarOrdenes() {
  const res = await fetch('/api/ordenes');
  const ordenes = await res.json();

  tablaOrdenes.innerHTML = ordenes.map(o => `
    <tr class="${o.id === ordenSeleccionadaId ? 'selected' : ''}">
      <td>#ORD-${o.id}</td>
      <td><strong>${o.empresa}</strong></td>
      <td>${o.contacto}</td>
      <td>${o.fecha}</td>
      <td>${o.estado}</td>
      <td>${Number(o.total_metros).toFixed(1)} m</td>
      <td>$${Number(o.total_venta).toFixed(2)}</td>
      <td class="actions">
        <button class="btn-detail" onclick="seleccionarOrden(${o.id}, '${o.empresa.replace(/'/g, "\\'")}')">Ver Telas</button>
        <button class="btn-edit" onclick="editarOrden(${o.id}, '${o.empresa.replace(/'/g, "\\'")}', '${o.contacto.replace(/'/g, "\\'")}', '${o.fecha}', '${o.estado}')">Editar</button>
        <button class="btn-delete" onclick="eliminarOrden(${o.id})">Eliminar</button>
      </td>
    </tr>
  `).join('');
}

// ALTA Y CAMBIO MAESTRO
ordenForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('orden-id').value;
  const datos = {
    empresa: document.getElementById('empresa').value,
    contacto: document.getElementById('contacto').value,
    fecha: document.getElementById('fecha').value,
    estado: document.getElementById('estado').value
  };

  if (id) {
    await fetch(`/api/ordenes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos)
    });
  } else {
    await fetch('/api/ordenes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos)
    });
  }

  resetearFormOrden();
  cargarOrdenes();
});

function editarOrden(id, empresa, contacto, fecha, estado) {
  document.getElementById('orden-id').value = id;
  document.getElementById('empresa').value = empresa;
  document.getElementById('contacto').value = contacto;
  document.getElementById('fecha').value = fecha;
  document.getElementById('estado').value = estado;
  document.getElementById('form-title').textContent = `Editando Orden #ORD-${id}`;
  document.getElementById('btn-cancelar').classList.remove('hidden');
}

document.getElementById('btn-cancelar').addEventListener('click', resetearFormOrden);

function resetearFormOrden() {
  ordenForm.reset();
  document.getElementById('orden-id').value = '';
  document.getElementById('form-title').textContent = 'Nueva Orden de Venta (Maestro)';
  document.getElementById('btn-cancelar').classList.add('hidden');
}

// BAJA MAESTRO
async function eliminarOrden(id) {
  if (!confirm(`¿Eliminar la orden #ORD-${id} y todo su detalle de telas?`)) return;
  await fetch(`/api/ordenes/${id}`, { method: 'DELETE' });
  if (ordenSeleccionadaId === id) {
    ordenSeleccionadaId = null;
    detalleForm.classList.add('hidden');
    document.getElementById('detalle-titulo').textContent = '(Selecciona una orden)';
    tablaDetalles.innerHTML = `<tr><td colspan="7" class="empty">Orden eliminada.</td></tr>`;
  }
  cargarOrdenes();
}

// CONSULTA MAESTRO-DETALLE
async function seleccionarOrden(id, empresa) {
  ordenSeleccionadaId = id;
  document.getElementById('detalle-titulo').textContent = `— Orden #ORD-${id} (${empresa})`;
  detalleForm.classList.remove('hidden');
  cargarOrdenes();
  cargarDetalles(id);
}

async function cargarDetalles(ordenId) {
  const res = await fetch(`/api/ordenes/${ordenId}/detalles`);
  const detalles = await res.json();

  if (detalles.length === 0) {
    tablaDetalles.innerHTML = `<tr><td colspan="7" class="empty">Esta orden aún no tiene telas agregadas.</td></tr>`;
    return;
  }

  tablaDetalles.innerHTML = detalles.map(d => `
    <tr>
      <td>${d.id}</td>
      <td><strong>${d.tipo_tela}</strong></td>
      <td>${d.color}</td>
      <td>${Number(d.metros).toFixed(1)} m</td>
      <td>$${Number(d.precio_metro).toFixed(2)}</td>
      <td>$${(d.metros * d.precio_metro).toFixed(2)}</td>
      <td><button class="btn-delete" onclick="eliminarDetalle(${d.id})">Quitar</button></td>
    </tr>
  `).join('');
}

// ALTA DETALLE
detalleForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!ordenSeleccionadaId) return;

  const datos = {
    tipo_tela: document.getElementById('tipo_tela').value,
    color: document.getElementById('color').value,
    metros: parseFloat(document.getElementById('metros').value),
    precio_metro: parseFloat(document.getElementById('precio_metro').value)
  };

  await fetch(`/api/ordenes/${ordenSeleccionadaId}/detalles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos)
  });

  detalleForm.reset();
  cargarDetalles(ordenSeleccionadaId);
  cargarOrdenes();
});

// BAJA DETALLE
async function eliminarDetalle(detalleId) {
  await fetch(`/api/detalles/${detalleId}`, { method: 'DELETE' });
  cargarDetalles(ordenSeleccionadaId);
  cargarOrdenes();
}