/**
 * KinPlug Schema Extractor v1.0.1
 * App: Any Kintone App
 * Date: 2026-01-05
 */
(function(PLUGIN_ID) {
    'use strict';

    const KINPLUG = {
        primary: '#4F46E5',
        primaryDark: '#4338CA',
        success: '#10B981',
        error: '#EF4444'
    };

    kintone.events.on(['app.record.index.show'], function(event) {
        if (document.getElementById('kinplugSchemaExportBtn')) return event;

        const btn = document.createElement('button');
        btn.id = 'kinplugSchemaExportBtn';
        btn.innerHTML = '📊 Export App Schema';
        btn.style.cssText = `
            margin-left: 10px;
            padding: 8px 18px;
            background: linear-gradient(135deg, ${KINPLUG.primary} 0%, ${KINPLUG.primaryDark} 100%);
            color: #fff;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 600;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            box-shadow: 0 2px 4px rgba(79, 70, 229, 0.3);
            transition: all 0.2s ease;
        `;
        
        btn.onmouseenter = () => {
            btn.style.transform = 'translateY(-1px)';
            btn.style.boxShadow = '0 4px 8px rgba(79, 70, 229, 0.4)';
        };
        btn.onmouseleave = () => {
            btn.style.transform = 'translateY(0)';
            btn.style.boxShadow = '0 2px 4px rgba(79, 70, 229, 0.3)';
        };
        btn.onclick = exportAppSchema;

        const header = kintone.app.getHeaderMenuSpaceElement();
        if (header) header.appendChild(btn);

        return event;
    });

    async function exportAppSchema() {
        const btn = document.getElementById('kinplugSchemaExportBtn');
        const originalHTML = btn.innerHTML;
        
        try {
            btn.innerHTML = '⏳ Extracting...';
            btn.disabled = true;
            btn.style.opacity = '0.7';
            
            const appId = kintone.app.getId();
            if (!appId) throw new Error('Could not get app ID');

            const [fieldsResp, processResp, appResp] = await Promise.all([
                kintone.api(kintone.api.url('/k/v1/app/form/fields', true), 'GET', { app: appId }),
                kintone.api(kintone.api.url('/k/v1/app/status', true), 'GET', { app: appId }).catch(() => null),
                kintone.api(kintone.api.url('/k/v1/app', true), 'GET', { id: appId })
            ]);

            const appName = appResp.name || 'Unknown App';
            const csvData = [];

            // App Info
            csvData.push(['=== APP INFORMATION ===']);
            csvData.push(['App ID', 'App Name']);
            csvData.push([appId, appName]);
            csvData.push([]);

            // Fields - now includes Unique column
            csvData.push(['=== FIELD INFORMATION ===']);
            csvData.push(['Field Label', 'Field Code', 'Field Type', 'Required', 'Unique', 'Options/Settings', 'Default Value']);
            processFields(fieldsResp.properties).forEach(f => csvData.push(f));
            csvData.push([]);

            // Process Management
            if (processResp && processResp.enable) {
                csvData.push(['=== PROCESS MANAGEMENT ===']);
                csvData.push(['Status', 'Index']);
                const statuses = processResp.states || {};
                Object.keys(statuses).forEach(name => {
                    csvData.push([name, statuses[name].index || '']);
                });
                csvData.push([]);

                csvData.push(['=== ACTIONS ===']);
                csvData.push(['Action Name', 'From Status', 'To Status', 'Assignees']);
                const actions = processResp.actions || {};
                Object.keys(actions).forEach(name => {
                    const a = actions[name];
                    csvData.push([name, a.from || '', a.to || '', formatAssignees(a.assignee)]);
                });
                csvData.push([]);

                csvData.push(['=== STATUS ASSIGNEES ===']);
                csvData.push(['Status', 'Assignee Type', 'Assignees']);
                Object.keys(statuses).forEach(name => {
                    const s = statuses[name];
                    if (s.assignee) {
                        const info = formatAssigneeDetail(s.assignee);
                        csvData.push([name, info.type, info.entities]);
                    }
                });
            } else {
                csvData.push(['=== PROCESS MANAGEMENT ===']);
                csvData.push(['Process management is not enabled for this app']);
            }

            const timestamp = new Date().toISOString().slice(0, 10);
            const safeName = appName.replace(/[^a-zA-Z0-9]/g, '_');
            downloadCSV(csvData, `${safeName}_schema_${timestamp}.csv`);
            
            showNotification('App schema exported successfully!', 'success');
            
        } catch (error) {
            console.error('KinPlug Schema Export Error:', error);
            showNotification('Error: ' + error.message, 'error');
        } finally {
            btn.innerHTML = originalHTML;
            btn.disabled = false;
            btn.style.opacity = '1';
        }
    }

    function processFields(properties) {
        const rows = [];
        const sorted = Object.keys(properties).sort((a, b) => {
            const la = properties[a].label || a;
            const lb = properties[b].label || b;
            return la.localeCompare(lb);
        });

        for (const code of sorted) {
            const f = properties[code];
            if (['LABEL', 'HR', 'SPACER', 'GROUP'].includes(f.type)) continue;
            
            // Check for unique (prohibit duplicate values)
            const isUnique = f.unique === true ? 'Yes' : '';
            
            rows.push([
                esc(f.label || ''),
                esc(code),
                f.type,
                f.required ? 'Yes' : 'No',
                isUnique,
                esc(extractOptions(f)),
                esc(extractDefault(f))
            ]);

            if (f.type === 'SUBTABLE' && f.fields) {
                Object.keys(f.fields).forEach(sc => {
                    const sf = f.fields[sc];
                    const subUnique = sf.unique === true ? 'Yes' : '';
                    rows.push([
                        esc(`  └ ${sf.label || ''}`),
                        esc(`${code}.${sc}`),
                        sf.type,
                        sf.required ? 'Yes' : 'No',
                        subUnique,
                        esc(extractOptions(sf)),
                        esc(extractDefault(sf))
                    ]);
                });
            }
        }
        return rows;
    }

    function extractOptions(f) {
        switch (f.type) {
            case 'DROP_DOWN':
            case 'RADIO_BUTTON':
            case 'CHECK_BOX':
            case 'MULTI_SELECT':
                return f.options ? Object.keys(f.options).map(k => f.options[k].label).join('; ') : '';
            case 'USER_SELECT':
            case 'ORGANIZATION_SELECT':
            case 'GROUP_SELECT':
                return f.entities ? `Entities: ${f.entities.length}` : '';
            case 'NUMBER':
                const n = [];
                if (f.minValue !== undefined && f.minValue !== '') n.push(`Min: ${f.minValue}`);
                if (f.maxValue !== undefined && f.maxValue !== '') n.push(`Max: ${f.maxValue}`);
                if (f.digit !== undefined) n.push(`Decimals: ${f.digit}`);
                if (f.unit) n.push(`Unit: ${f.unit}`);
                return n.join('; ');
            case 'CALC':
                return f.expression ? `Formula: ${f.expression}` : '';
            case 'LINK':
                return f.protocol ? `Protocol: ${f.protocol}` : '';
            case 'REFERENCE_TABLE':
                if (!f.referenceTable) return '';
                const r = [];
                if (f.referenceTable.relatedApp) r.push(`App: ${f.referenceTable.relatedApp.app}`);
                if (f.referenceTable.condition) r.push(`Condition: ${f.referenceTable.condition.field}`);
                return r.join('; ');
            case 'LOOKUP':
                if (!f.lookup) return '';
                const l = [];
                if (f.lookup.relatedApp) l.push(`App: ${f.lookup.relatedApp.app}`);
                if (f.lookup.relatedKeyField) l.push(`Key: ${f.lookup.relatedKeyField}`);
                return l.join('; ');
            case 'SINGLE_LINE_TEXT':
            case 'MULTI_LINE_TEXT':
                const t = [];
                if (f.minLength) t.push(`Min: ${f.minLength}`);
                if (f.maxLength) t.push(`Max: ${f.maxLength}`);
                return t.join('; ');
            default:
                return '';
        }
    }

    function extractDefault(f) {
        if (!f.defaultValue) return '';
        if (Array.isArray(f.defaultValue)) return f.defaultValue.join('; ');
        return String(f.defaultValue);
    }

    function formatAssignees(a) {
        if (!a) return '';
        const p = [];
        if (a.type) p.push(`Type: ${a.type}`);
        if (a.entities && a.entities.length > 0) {
            const names = a.entities.map(e => e.entity ? `${e.entity.type}:${e.entity.code}` : e.code || JSON.stringify(e));
            p.push(`Entities: ${names.join(', ')}`);
        }
        return p.join('; ');
    }

    function formatAssigneeDetail(a) {
        if (!a) return { type: '', entities: '' };
        let e = '';
        if (a.entities && a.entities.length > 0) {
            e = a.entities.map(x => x.entity ? `${x.entity.type}:${x.entity.code}` : x.code || JSON.stringify(x)).join(', ');
        }
        return { type: a.type || '', entities: e };
    }

    function esc(v) {
        if (v === null || v === undefined) return '';
        const s = String(v);
        if (s.includes(',') || s.includes('"') || s.includes('\n')) {
            return `"${s.replace(/"/g, '""')}"`;
        }
        return s;
    }

    function downloadCSV(data, filename) {
        const csv = data.map(row => row.join(',')).join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    }

    function showNotification(message, type) {
        const existing = document.getElementById('kinplugNotification');
        if (existing) existing.remove();

        const n = document.createElement('div');
        n.id = 'kinplugNotification';
        n.innerHTML = `
            <span style="margin-right:8px">${type === 'success' ? '✅' : '❌'}</span>
            <span>${message}</span>
        `;
        n.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 14px 20px;
            background: ${type === 'success' ? KINPLUG.success : KINPLUG.error};
            color: #fff;
            border-radius: 8px;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            font-size: 14px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            align-items: center;
            animation: kinplugSlideIn 0.3s ease-out;
        `;

        const style = document.createElement('style');
        style.textContent = `
            @keyframes kinplugSlideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes kinplugSlideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
        document.body.appendChild(n);

        setTimeout(() => {
            n.style.animation = 'kinplugSlideOut 0.3s ease-out forwards';
            setTimeout(() => n.remove(), 300);
        }, 3000);
    }

})(kintone.$PLUGIN_ID);
