window.addEventListener('error', function(e) {
      const box = document.createElement('div');
      box.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#ff6b5c;color:#121210;padding:10px 14px;font:13px monospace;z-index:999;white-space:pre-wrap;';
      box.textContent = 'Erro: ' + e.message;
      document.body.prepend(box);
    });
    (function() {
      const STORAGE_KEY = 'workout-log:entries';
      let entries = [];
      let loaded = false;
      
      const WEEKDAYS = [
        { full: 'Domingo', short: 'Dom' },
        { full: 'Segunda-feira', short: 'Seg' },
        { full: 'Terça-feira', short: 'Ter' },
        { full: 'Quarta-feira', short: 'Qua' },
        { full: 'Quinta-feira', short: 'Qui' },
        { full: 'Sexta-feira', short: 'Sex' },
        { full: 'Sábado', short: 'Sáb' }
      ];
      const todayWeekday = new Date().getDay();
      let activeWeekday = todayWeekday;
      
      const weekdaysEl = document.getElementById('weekdays');
      
      const form = document.getElementById('form');
      const listEl = document.getElementById('list');
      const statsEl = document.getElementById('stats');
      const submitBtn = document.getElementById('submitBtn');
      const overlay = document.getElementById('overlay');
      const openBtn = document.getElementById('openBtn');
      const closeBtn = document.getElementById('closeBtn');
      const sheetTitle = document.getElementById('sheetTitle');
      let editingId = null;
      
      function openSheet() {
        overlay.classList.add('open');
        errorMsg.classList.remove('show');
        document.querySelectorAll('input.invalid').forEach(i => i.classList.remove('invalid'));
        setTimeout(() => document.getElementById('exercicio').focus(), 50);
      }
      
      function closeSheet() {
        overlay.classList.remove('open');
        editingId = null;
        sheetTitle.textContent = `Novo · ${WEEKDAYS[activeWeekday].full}`;
        submitBtn.textContent = 'Adicionar';
        form.reset();
      }
      
      function editEntry(id) {
        const entry = entries.find(e => e.id === id);
        if (!entry) return;
        editingId = id;
        sheetTitle.textContent = 'Editar exercício';
        submitBtn.textContent = 'Salvar';
        document.getElementById('exercicio').value = entry.exercicio;
        document.getElementById('carga').value = entry.carga;
        document.getElementById('series').value = entry.series;
        document.getElementById('reps').value = entry.reps || '';
        openSheet();
      }
      openBtn.addEventListener('click', () => {
        editingId = null;
        sheetTitle.textContent = `Novo · ${WEEKDAYS[activeWeekday].full}`;
        submitBtn.textContent = 'Adicionar';
        form.reset();
        openSheet();
      });
      closeBtn.addEventListener('click', closeSheet);
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeSheet();
      });
      
      function renderWeekdayTabs() {
        weekdaysEl.innerHTML = WEEKDAYS.map((w, i) => {
          const count = entries.filter(e => e.weekday === i).length;
          const classes = ['weekday-btn'];
          if (i === activeWeekday) classes.push('active');
          if (i === todayWeekday) classes.push('today');
          return `<button class="${classes.join(' ')}" data-day="${i}">
        <span class="short">${w.short}</span>
        <span class="count">${count}</span>
      </button>`;
        }).join('');
        
        weekdaysEl.querySelectorAll('.weekday-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            activeWeekday = parseInt(btn.dataset.day, 10);
            render();
          });
        });
      }
      
      function render() {
        renderWeekdayTabs();
        
        const dayEntries = entries.filter(e => e.weekday === activeWeekday);
        
        
       
        
        if (!loaded) {
          listEl.innerHTML = '<div class="status">Carregando...</div>';
          return;
        }
        
        if (dayEntries.length === 0) {
          listEl.innerHTML = `
        <div class="empty">
          <span class="big">Nada em ${WEEKDAYS[activeWeekday].full}</span>
          Adicione um exercício pra este dia.
        </div>
      `;
          return;
        }
        
        const sorted = [...dayEntries].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        listEl.innerHTML = `
      <div class="day-group">
        ${sorted.map((e, i) => `
          <div class="entry" data-id="${e.id}">
            <button class="drag-handle" title="Arraste para reordenar">≡</button>
            <div class="entry-body">
              <div class="name">${escapeHtml(e.exercicio)}
              </div>
              <div class="meta"><b>${e.carga}kg</b> · <b>${e.series}</b> séries 
                <b>${e.reps}</b> 
                reps 
              </div>
            </div>
            <div class="entry-actions">
              <button class="edit" data-id="${e.id}" title="Editar">✎</button>
              <button class="del" data-id="${e.id}" title="Excluir">✕</button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
        
        listEl.querySelectorAll('.del').forEach(btn => {
          btn.addEventListener('click', () => removeEntry(btn.dataset.id));
        });
        listEl.querySelectorAll('.edit').forEach(btn => {
          btn.addEventListener('click', () => editEntry(btn.dataset.id));
        });
        listEl.querySelectorAll('.drag-handle').forEach(handle => {
          handle.addEventListener('pointerdown', startDrag);
        });
      }
      
      function escapeHtml(str) {
        const d = document.createElement('div');
        d.textContent = str;
        return d.innerHTML;
      }
      
      function showStorageWarning(msg) {
        if (document.getElementById('storageWarning')) return;
        const box = document.createElement('div');
        box.id = 'storageWarning';
        box.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#ffb020;color:#121210;padding:10px 14px;font-size:13px;z-index:998;text-align:center;';
        box.textContent = msg;
        document.body.prepend(box);
      }
      
      async function loadEntries() {
        try {
          const raw = window.localStorage.getItem(STORAGE_KEY);
          entries = raw ? JSON.parse(raw) : [];
        } catch (err) {
          console.error('Erro ao carregar:', err);
          showStorageWarning('Não foi possível carregar os dados salvos.');
          entries = [];
        }
        loaded = true;
        render();
      }
      
      async function saveEntries() {
        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
        } catch (err) {
          console.error('Erro ao salvar:', err);
          showStorageWarning('Não foi possível salvar os dados.');
        }
      }
      
      async function removeEntry(id) {
        entries = entries.filter(e => e.id !== id);
        render();
        await saveEntries();
      }
      
      function startDrag(e) {
        e.preventDefault();
        const entryEl = e.currentTarget.closest('.entry');
        const list = entryEl.parentElement;
        entryEl.setPointerCapture && e.pointerId != null && entryEl.setPointerCapture(e.pointerId);
        
        const startY = e.clientY;
        const originalTop = entryEl.offsetTop;
        const height = entryEl.offsetHeight;
        
        entryEl.classList.add('dragging');
        
        function onMove(ev) {
          const dy = ev.clientY - startY;
          const visualTop = originalTop + dy;
          entryEl.style.transform = `translateY(${visualTop - entryEl.offsetTop}px)`;
          
          let prev = entryEl.previousElementSibling;
          while (prev) {
            const prevMid = prev.offsetTop + prev.offsetHeight / 2;
            if (visualTop < prevMid) {
              list.insertBefore(entryEl, prev);
              entryEl.style.transform = `translateY(${visualTop - entryEl.offsetTop}px)`;
              prev = entryEl.previousElementSibling;
            } else break;
          }
          let next = entryEl.nextElementSibling;
          while (next) {
            const nextMid = next.offsetTop + next.offsetHeight / 2;
            if (visualTop + height > nextMid) {
              list.insertBefore(next, entryEl);
              entryEl.style.transform = `translateY(${visualTop - entryEl.offsetTop}px)`;
              next = entryEl.nextElementSibling;
            } else break;
          }
        }
        
        async function onUp() {
          document.removeEventListener('pointermove', onMove);
          document.removeEventListener('pointerup', onUp);
          entryEl.classList.remove('dragging');
          entryEl.style.transform = '';
          
          const ids = Array.from(list.querySelectorAll('.entry')).map(el => el.dataset.id);
          ids.forEach((id, idx) => {
            const en = entries.find(x => x.id === id);
            if (en) en.order = idx;
          });
          await saveEntries();
        }
        
        document.addEventListener('pointermove', onMove);
        document.addEventListener('pointerup', onUp);
      }
      
      const errorMsg = document.getElementById('errorMsg');
      
      function showError(msg, ...invalidInputs) {
        errorMsg.textContent = msg;
        errorMsg.classList.add('show');
        document.querySelectorAll('input.invalid').forEach(i => i.classList.remove('invalid'));
        invalidInputs.forEach(i => i.classList.add('invalid'));
      }
      
      function clearError() {
        errorMsg.classList.remove('show');
        document.querySelectorAll('input.invalid').forEach(i => i.classList.remove('invalid'));
      }
      
      form.addEventListener('submit', async function(e) {
        e.preventDefault();
        clearError();
        
        const exercicioInput = document.getElementById('exercicio');
        const cargaInput = document.getElementById('carga');
        const seriesInput = document.getElementById('series');
        const repsInput = document.getElementById('reps');
        
        const exercicio = exercicioInput.value.trim();
        const carga = parseFloat(cargaInput.value);
        const series = parseInt(seriesInput.value, 10);
        const reps = parseInt(repsInput.value, 10);
        
        if (!exercicio) {
          showError('Digite o nome do exercício.', exercicioInput);
          exercicioInput.focus();
          return;
        }
        if (isNaN(carga) || carga < 0) {
          showError('Digite a carga em kg.', cargaInput);
          cargaInput.focus();
          return;
        }
        if (isNaN(series) || series < 0) {
          showError('Digite o número de séries.', seriesInput);
          seriesInput.focus();
          return;
        }
        if (isNaN(reps) || reps < 0) {
          showError('Digite o número de reps.', seriesInput);
          repsInput.focus();
          return;
        }
        
        submitBtn.disabled = true;
        submitBtn.textContent = 'Salvando...';
        
        if (editingId) {
          const idx = entries.findIndex(e => e.id === editingId);
          if (idx !== -1) {
            entries[idx] = { ...entries[idx], exercicio, carga, series, reps };
          }
        } else {
          const dayEntries = entries.filter(e => e.weekday === activeWeekday);
          const maxOrder = dayEntries.reduce((max, e) => Math.max(max, e.order ?? 0), -1);
          const entry = {
            id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
            exercicio,
            carga,
            series,
            reps,
            weekday: activeWeekday,
            order: maxOrder + 1,
            createdAt: new Date().toISOString()
          };
          entries.unshift(entry);
        }
        render();
        await saveEntries();
        
        clearError();
        submitBtn.disabled = false;
        closeSheet();
      });
      
      loadEntries();
    })();
