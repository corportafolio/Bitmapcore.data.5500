#!/usr/bin/env python3
"""
BitmapCore Daily Analytics Report
Genera informe diario de métricas y lo envía por email.
Uso: python3 daily_report.py
Cron: 0 7 * * * cd /root/bitmapcore-web && python3 daily_report.py
"""

import sqlite3
import smtplib
import json
import os
import sys
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
from collections import defaultdict

# === CONFIGURACIÓN ===
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data', 'analytics.db')
SMTP_HOST = os.environ.get('SMTP_HOST', 'smtp.gmail.com')
SMTP_PORT = int(os.environ.get('SMTP_PORT', '587'))
SMTP_USER = os.environ.get('SMTP_USER', '')
SMTP_PASS = os.environ.get('SMTP_PASS', '')
EMAIL_TO = os.environ.get('EMAIL_TO', '')
EMAIL_FROM = SMTP_USER
SITE_URL = 'https://bitmapcore.net'

if not SMTP_USER or not SMTP_PASS or not EMAIL_TO:
    print("ERROR: Configura SMTP_USER, SMTP_PASS, EMAIL_TO en variables de entorno o en .env")
    print("Ejemplo:")
    print("  export SMTP_USER=tu@gmail.com")
    print("  export SMTP_PASS=xxxx-xxxx-xxxx-xxxx")
    print("  export EMAIL_TO=destino@gmail.com")
    sys.exit(1)


def load_env():
    env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env')
    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if '=' in line and not line.startswith('#'):
                    key, val = line.split('=', 1)
                    os.environ.setdefault(key.strip(), val.strip())


def get_db():
    if not os.path.exists(DB_PATH):
        print(f"ERROR: Database no encontrada: {DB_PATH}")
        sys.exit(1)
    return sqlite3.connect(DB_PATH)


def query_metrics(db, days=1, offset=0):
    now = datetime.utcnow()
    start = now - timedelta(days=days + offset)
    end = now - timedelta(days=offset)
    ts_start = int(start.timestamp() * 1000)
    ts_end = int(end.timestamp() * 1000)

    metrics = {}

    row = db.execute(
        'SELECT COUNT(*) FROM events WHERE created_at BETWEEN ? AND ?',
        (ts_start, ts_end)
    ).fetchone()
    metrics['total_events'] = row[0]

    row = db.execute(
        'SELECT COUNT(DISTINCT session_id) FROM events WHERE created_at BETWEEN ? AND ?',
        (ts_start, ts_end)
    ).fetchone()
    metrics['sessions'] = row[0]

    row = db.execute(
        'SELECT COUNT(DISTINCT user_id) FROM events WHERE created_at BETWEEN ? AND ?',
        (ts_start, ts_end)
    ).fetchone()
    metrics['unique_users'] = row[0]

    row = db.execute(
        'SELECT COUNT(*) FROM page_views WHERE created_at BETWEEN ? AND ?',
        (ts_start, ts_end)
    ).fetchone()
    metrics['page_views'] = row[0]

    top_pages = db.execute(
        '''SELECT page_url, COUNT(*) as views, AVG(time_on_page_ms) as avg_time, AVG(scroll_depth) as avg_scroll
           FROM page_views WHERE created_at BETWEEN ? AND ?
           GROUP BY page_url ORDER BY views DESC LIMIT 10''',
        (ts_start, ts_end)
    ).fetchall()
    metrics['top_pages'] = top_pages

    event_types = db.execute(
        '''SELECT event_type, COUNT(*) as c FROM events
           WHERE created_at BETWEEN ? AND ?
           GROUP BY event_type ORDER BY c DESC''',
        (ts_start, ts_end)
    ).fetchall()
    metrics['event_types'] = event_types

    devices = db.execute(
        '''SELECT device_type, COUNT(*) as c FROM events
           WHERE created_at BETWEEN ? AND ?
           GROUP BY device_type ORDER BY c DESC''',
        (ts_start, ts_end)
    ).fetchall()
    metrics['devices'] = devices

    browsers = db.execute(
        '''SELECT browser, COUNT(*) as c FROM events
           WHERE created_at BETWEEN ? AND ?
           GROUP BY browser ORDER BY c DESC''',
        (ts_start, ts_end)
    ).fetchall()
    metrics['browsers'] = browsers

    buy_clicks = db.execute(
        '''SELECT COUNT(*) FROM events
           WHERE event_type IN ('buy_initiated', 'buy_confirmed', 'buy_completed')
           AND created_at BETWEEN ? AND ?''',
        (ts_start, ts_end)
    ).fetchone()[0]
    metrics['buy_actions'] = buy_clicks

    list_clicks = db.execute(
        '''SELECT COUNT(*) FROM events
           WHERE event_type IN ('list_initiated', 'list_confirmed', 'list_submitted')
           AND created_at BETWEEN ? AND ?''',
        (ts_start, ts_end)
    ).fetchone()[0]
    metrics['list_actions'] = list_clicks

    wallet_conns = db.execute(
        '''SELECT COUNT(*) FROM events
           WHERE event_type = 'wallet_connected'
           AND created_at BETWEEN ? AND ?''',
        (ts_start, ts_end)
    ).fetchone()[0]
    metrics['wallet_connects'] = wallet_conns

    utm_sources = db.execute(
        '''SELECT utm_source, COUNT(*) as c FROM events
           WHERE utm_source IS NOT NULL AND utm_source != ''
           AND created_at BETWEEN ? AND ?
           GROUP BY utm_source ORDER BY c DESC LIMIT 5''',
        (ts_start, ts_end)
    ).fetchall()
    metrics['utm_sources'] = utm_sources

    errors = db.execute(
        '''SELECT COUNT(*) FROM events
           WHERE event_type = 'error'
           AND created_at BETWEEN ? AND ?''',
        (ts_start, ts_end)
    ).fetchone()[0]
    metrics['js_errors'] = errors

    return metrics


def calc_change(current, previous):
    if previous == 0:
        return '+∞' if current > 0 else '0%'
    change = ((current - previous) / previous) * 100
    sign = '+' if change >= 0 else ''
    return f'{sign}{change:.0f}%'


def generate_insights(metrics_today, metrics_yesterday, metrics_7d):
    insights = []

    sessions = metrics_today['sessions']
    sessions_y = metrics_yesterday['sessions']
    sessions_7d_avg = metrics_7d['sessions'] / 7 if metrics_7d['sessions'] > 0 else 1
    change = ((sessions - sessions_y) / sessions_y * 100) if sessions_y > 0 else 0

    if change > 20:
        insights.append(('up', f'Trafico subio {change:.0f}% vs ayer ({sessions} sesiones). Revisar si hay tweet/post viral o cambio reciente.'))
    elif change < -20:
        insights.append(('down', f'Trafico bajo {abs(change):.0f}% vs ayer ({sessions} sesiones). Verificar si hay caida en redes o SEO.'))

    if metrics_today['buy_actions'] > 0:
        conversion = (metrics_today['buy_actions'] / metrics_today['sessions'] * 100) if metrics_today['sessions'] > 0 else 0
        insights.append(('info', f'Conversion compras: {conversion:.1f}% ({metrics_today["buy_actions"]} acciones de compra en {sessions} sesiones)'))

    if metrics_today['list_actions'] > 0:
        insights.append(('info', f'Listings: {metrics_today["list_actions"]} acciones de listar'))

    if metrics_today['wallet_connects'] > 0:
        insights.append(('info', f'Wallet connects nuevos: {metrics_today["wallet_connects"]}'))

    if metrics_today['js_errors'] > 5:
        insights.append(('warn', f'{metrics_today["js_errors"]} errores JS detectados. Revisar logs del navegador en consola.'))

    if metrics_today['page_views'] > 0 and metrics_today['sessions'] > 0:
        pps = metrics_today['page_views'] / metrics_today['sessions']
        if pps < 1.5:
            insights.append(('warn', f'Pocas paginas por sesion ({pps:.1f}). Los usuarios pueden no encontrar lo que buscan.'))

    for page_url, views, avg_time, avg_scroll in metrics_today['top_pages'][:3]:
        if avg_time and avg_time < 5000 and views > 10:
            insights.append(('warn', f'Pagina {page_url[:50]} tiene tiempo bajo ({avg_time/1000:.1f}s). Puede haber problemas de carga.'))

    if not insights:
        insights.append(('info', 'Sin anomalias significativas. Trafico estable.'))

    return insights


def format_report(metrics_today, metrics_yesterday, metrics_7d):
    today = datetime.utcnow().strftime('%Y-%m-%d')
    yesterday = (datetime.utcnow() - timedelta(days=1)).strftime('%Y-%m-%d')
    insights = generate_insights(metrics_today, metrics_yesterday, metrics_7d)

    rows_html = ''
    for label, key in [
        ('Sesiones', 'sessions'), ('Usuarios unicos', 'unique_users'),
        ('Paginas vistas', 'page_views'), ('Eventos totales', 'total_events'),
        ('Acciones compra', 'buy_actions'), ('Acciones listar', 'list_actions'),
        ('Wallet connects', 'wallet_connects'), ('Errores JS', 'js_errors')
    ]:
        val = metrics_today[key]
        prev = metrics_yesterday[key]
        change = calc_change(val, prev)
        color = '#00AA00' if '+' in change and change != '+∞' else ('#FF3333' if '-' in change else '#B0B0B0')
        rows_html += f'<tr><td style="padding:8px 12px;border-bottom:1px solid #2A2A2A;color:#B0B0B0">{label}</td><td style="padding:8px 12px;border-bottom:1px solid #2A2A2A;color:#fff;text-align:right;font-weight:bold">{val:,}</td><td style="padding:8px 12px;border-bottom:1px solid #2A2A2A;color:{color};text-align:right">{change}</td></tr>\n'

    top_pages_html = ''
    for page_url, views, avg_time, avg_scroll in metrics_today['top_pages'][:8]:
        time_str = f'{avg_time/1000:.1f}s' if avg_time else '-'
        scroll_str = f'{avg_scroll:.0f}%' if avg_scroll else '-'
        short_url = page_url.replace(SITE_URL, '')[:60] if page_url else '-'
        top_pages_html += f'<tr><td style="padding:6px 12px;border-bottom:1px solid #2A2A2A;color:#B0B0B0;font-size:13px">{short_url}</td><td style="padding:6px 12px;border-bottom:1px solid #2A2A2A;color:#fff;text-align:right">{views}</td><td style="padding:6px 12px;border-bottom:1px solid #2A2A2A;color:#B0B0B0;text-align:right">{time_str}</td><td style="padding:6px 12px;border-bottom:1px solid #2A2A2A;color:#B0B0B0;text-align:right">{scroll_str}</td></tr>\n'

    events_html = ''
    for event_type, count in metrics_today['event_types']:
        events_html += f'<tr><td style="padding:4px 12px;border-bottom:1px solid #2A2A2A;color:#B0B0B0;font-size:13px">{event_type}</td><td style="padding:4px 12px;border-bottom:1px solid #2A2A2A;color:#fff;text-align:right">{count:,}</td></tr>\n'

    devices_html = ''
    for device, count in metrics_today['devices']:
        devices_html += f'<span style="display:inline-block;padding:4px 10px;margin:2px;background:#191217;border:1px solid #2A2A2A;border-radius:6px;color:#B0B0B0;font-size:13px">{device}: {count:,}</span> '

    insights_html = ''
    for level, msg in insights:
        icon = {'up': '🟢', 'down': '🔴', 'warn': '⚠️', 'info': 'ℹ️'}.get(level, '•')
        insights_html += f'<div style="padding:8px 12px;margin:4px 0;background:#191217;border-left:3px solid {"#00AA00" if level == "up" else "#FF3333" if level in ("down","warn") else "#FE3E00"};border-radius:0 6px 6px 0;color:#B0B0B0;font-size:14px">{icon} {msg}</div>\n'

    html = f'''<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#080008;font-family:Acme,sans-serif">
<div style="max-width:600px;margin:0 auto;padding:20px">

<div style="text-align:center;padding:20px 0;border-bottom:2px solid #FE3E00">
<h1 style="color:#FE3E00;margin:0;font-size:24px">BitmapCore Analytics</h1>
<p style="color:#666;margin:5px 0 0;font-size:14px">Informe diario - {today}</p>
</div>

<div style="padding:20px 0">
<h2 style="color:#fff;font-size:18px;margin-bottom:12px">Resumen del dia vs ayer</h2>
<table style="width:100%;border-collapse:collapse;background:#191217;border-radius:8px;overflow:hidden">
{rows_html}
</table>
</div>

<div style="padding:20px 0">
<h2 style="color:#fff;font-size:18px;margin-bottom:12px">Insights Accionables</h2>
{insights_html}
</div>

<div style="padding:20px 0">
<h2 style="color:#fff;font-size:18px;margin-bottom:12px">Paginas mas visitadas</h2>
<table style="width:100%;border-collapse:collapse;background:#191217;border-radius:8px;overflow:hidden">
<tr style="background:#2A2A2A"><th style="padding:8px 12px;color:#B0B0B0;text-align:left;font-size:13px">Pagina</th><th style="padding:8px 12px;color:#B0B0B0;text-align:right;font-size:13px">Vistas</th><th style="padding:8px 12px;color:#B0B0B0;text-align:right;font-size:13px">Tiempo</th><th style="padding:8px 12px;color:#B0B0B0;text-align:right;font-size:13px">Scroll</th></tr>
{top_pages_html}
</table>
</div>

<div style="padding:20px 0">
<h2 style="color:#fff;font-size:18px;margin-bottom:12px">Eventos por tipo</h2>
<table style="width:100%;border-collapse:collapse;background:#191217;border-radius:8px;overflow:hidden">
{events_html}
</table>
</div>

<div style="padding:20px 0">
<h2 style="color:#fff;font-size:18px;margin-bottom:12px">Dispositivos</h2>
{devices_html}
</div>

<div style="text-align:center;padding:20px 0;border-top:1px solid #2A2A2A">
<p style="color:#666;font-size:12px;margin:0">
<a href="{SITE_URL}" style="color:#FE3E00">{SITE_URL}</a>
</p>
</div>

</div>
</body>
</html>'''

    return html


def send_email(html_content, today):
    msg = MIMEMultipart('alternative')
    msg['Subject'] = f'BitmapCore Analytics - {today}'
    msg['From'] = EMAIL_FROM
    msg['To'] = EMAIL_TO

    text_part = MIMEText('Abre este email en un cliente que soporte HTML para ver el informe.', 'plain', 'utf-8')
    html_part = MIMEText(html_content, 'html', 'utf-8')
    msg.attach(text_part)
    msg.attach(html_part)

    try:
        server = smtplib.SMTP(SMTP_HOST, SMTP_PORT)
        server.ehlo()
        server.starttls()
        server.ehlo()
        server.login(SMTP_USER, SMTP_PASS)
        server.sendmail(EMAIL_FROM, [EMAIL_TO], msg.as_string())
        server.quit()
        print(f"Email enviado a {EMAIL_TO}")
        return True
    except Exception as e:
        print(f"ERROR al enviar email: {e}")
        return False


def main():
    load_env()
    db = get_db()

    print("Consultando metricas de hoy...")
    metrics_today = query_metrics(db, days=1, offset=0)

    print("Consultando metricas de ayer...")
    metrics_yesterday = query_metrics(db, days=1, offset=1)

    print("Consultando metricas de 7 dias...")
    metrics_7d = query_metrics(db, days=7, offset=0)

    print("Generando informe...")
    today = datetime.utcnow().strftime('%Y-%m-%d')
    html = format_report(metrics_today, metrics_yesterday, metrics_7d)

    print("Enviando email...")
    send_email(html, today)

    db.close()
    print("Reporte completado.")


if __name__ == '__main__':
    main()
