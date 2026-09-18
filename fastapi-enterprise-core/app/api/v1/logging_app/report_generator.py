import os
import re
import matplotlib
matplotlib.use('Agg')  # Prevents GUI popup errors on servers
import matplotlib.pyplot as plt
from datetime import datetime, timedelta, timezone
import json
import ollama
from weasyprint import HTML
from io import BytesIO

def generate_pdf_report(logs: list, model_name: str = "llama3.2") -> bytes:
    # 1. Compute metrics for the chart and summary cards dynamically from the logs
    severity_counts = {"INFO": 0, "WARNING": 0, "ERROR": 0, "CRITICAL": 0}
    service_set = set()
    machine_set = set()  # Track unique machine sources
    username_set = set() # Track unique usernames instead of IDs
    total_records = len(logs)
    critical_errors = 0

    ph_timezone = timezone(timedelta(hours=8))

    # Extract dynamic time window and filter details from the selected log items with PST conversion
    timestamps = [log.timestamp for log in logs if hasattr(log, 'timestamp') and log.timestamp]
    if timestamps:
        raw_start = min(timestamps)
        raw_end = max(timestamps)
        
        def convert_to_pst_str(ts):
            if isinstance(ts, datetime):
                dt_utc = ts if ts.tzinfo else ts.replace(tzinfo=timezone.utc)
                dt_pst = dt_utc.astimezone(ph_timezone)
                return dt_pst.strftime('%Y-%m-%d %H:%M:%S PST')
            
            ts_str = str(ts)
            for fmt in ('%Y-%m-%d %H:%M:%S.%f%z', '%Y-%m-%d %H:%M:%S.%f', '%Y-%m-%d %H:%M:%S'):
                try:
                    clean_str = ts_str.split('+')[0].split('Z')[0].strip()
                    dt = datetime.strptime(clean_str, '%Y-%m-%d %H:%M:%S.%f' if '.' in clean_str else '%Y-%m-%d %H:%M:%S')
                    dt_utc = dt.replace(tzinfo=timezone.utc)
                    dt_pst = dt_utc.astimezone(ph_timezone)
                    return dt_pst.strftime('%Y-%m-%d %H:%M:%S PST')
                except ValueError:
                    continue
            return ts_str

        start_time_str = convert_to_pst_str(raw_start)
        end_time_str = convert_to_pst_str(raw_end)
        time_range_str = f"{start_time_str} to {end_time_str}"
    else:
        time_range_str = datetime.now(ph_timezone).strftime('%Y-%m-%d %H:%M:%S PST')

    for log in logs:
        lvl = log.level.upper()
        if lvl in severity_counts:
            severity_counts[lvl] += 1
        else:
            severity_counts["INFO"] += 1
            
        if lvl in ("ERROR", "CRITICAL", "FATAL"):
            critical_errors += 1
            
        if hasattr(log, 'service_name') and log.service_name:
            service_set.add(log.service_name)

        # Extract machine_id if present
        m_id = getattr(log, 'machine_id', None)
        if m_id:
            machine_set.add(m_id)
            
        # Extract username specifically with robust validation & fallback parsing
        u_name = getattr(log, 'username', None)
        u_str = str(u_name).strip() if u_name else ""
        
        if u_str.lower() in ('', 'none', 'null', 'n/a', 'undefined'):
            u_str = ""

        # Fallback 1: Parse out text matching user identifiers from the log message body if empty
        if not u_str and hasattr(log, 'message') and log.message:
            match = re.search(r"(?:username|user|actor|account)[:=]?\s*([^\s,]+)", log.message, re.IGNORECASE)
            if match:
                candidate = match.group(1).strip()
                if candidate.lower() not in ('', 'none', 'null', 'n/a', 'undefined'):
                    u_str = candidate

        # Fallback 2: Check if metrics dictionary contains user identity keys
        if not u_str and hasattr(log, 'metrics') and isinstance(log.metrics, dict):
            for k in ('username', 'user', 'account', 'actor'):
                if k in log.metrics and log.metrics[k]:
                    candidate = str(log.metrics[k]).strip()
                    if candidate.lower() not in ('', 'none', 'null', 'n/a', 'undefined'):
                        u_str = candidate
                        break

        # Fallback 3: Check if user_id functions as a readable name string instead of a UUID
        if not u_str:
            raw_uid = getattr(log, 'user_id', None)
            if raw_uid:
                candidate = str(raw_uid).strip()
                if candidate.lower() not in ('', 'none', 'null', 'n/a', 'undefined') and len(candidate) <= 36 and "-" not in candidate:
                    u_str = candidate

        if u_str:
            username_set.add(u_str)

    error_rate = (critical_errors / total_records * 100) if total_records > 0 else 0.0

    # Format lists as bulleted HTML elements for metadata display
    if service_set:
        service_items_html = "".join([f"<li>{svc}</li>" for svc in sorted(service_set)])
        services_str = f"<ul style='margin: 0; padding-left: 15px;'>{service_items_html}</ul>"
    else:
        services_str = "All / None Specified"

    # Build machine list HTML string
    if machine_set:
        machine_items_html = "".join([f"<li>{m}</li>" for m in sorted(machine_set)])
        machines_str = f"<ul style='margin: 0; padding-left: 15px;'>{machine_items_html}</ul>"
    else:
        machines_str = "None / Unspecified"

    # Build username list HTML string
    if username_set:
        user_items_html = "".join([f"<li>{uname}</li>" for uname in sorted(username_set)])
        users_str = f"<ul style='margin: 0; padding-left: 15px;'>{user_items_html}</ul>"
    else:
        users_str = "None / Unauthenticated"

    # Compute Report Generated Timestamp in Philippine Standard Time (PST, UTC+8)
    report_generated_str = datetime.now(ph_timezone).strftime('%Y-%m-%d %H:%M:%S PST')

    # 2. Generate Chart with Matplotlib
    fig, ax = plt.subplots(figsize=(6, 2.4))
    categories = list(severity_counts.keys())
    counts = list(severity_counts.values())
    colors = ['#3b82f6', '#f59e0b', '#ef4444', '#991b1b']

    ax.bar(categories, counts, color=colors, width=0.45)
    ax.set_title('Log Severity Distribution Breakdown', fontsize=10, fontweight='bold', color='#1e293b')
    ax.set_ylabel('Frequency', fontsize=8, color='#64748b')
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    ax.spines['left'].set_color('#cbd5e1')
    ax.spines['bottom'].set_color('#cbd5e1')
    ax.tick_params(colors='#64748b', labelsize=8)
    ax.grid(axis='y', linestyle='--', alpha=0.4)
    plt.tight_layout()
    
    chart_path = "temp_severity_chart.png"
    plt.savefig(chart_path, dpi=300, transparent=True)
    plt.close()

    # 3. Format logs and query Ollama with strict structure requiring distinct recommendations
    formatted_logs = "\n".join([
        f"[{log.timestamp}] {log.level.upper()} (Service: {log.service_name} | Machine: {getattr(log, 'machine_id', 'N/A')}): {log.message}" 
        for log in logs
    ])

    prompt = (
        "You are a Senior Systems Reliability Engineer. Analyze the provided logs and write a comprehensive "
        "technical briefing report. You MUST structure your response into exactly three sections using explicit "
        "HTML headings:\n"
        "<h3>1. System Health Overview</h3>\n"
        "<h3>2. Top Risk Factors & Root Causes</h3>\n"
        "<h3>3. Concrete Recommendations & Action Items</h3>\n"
        "Under section 3, provide bulleted, explicit, and direct operational recommendations to resolve and prevent "
        "the issues found in these specific logs. Do not reference AI, language models, or automated scripts.\n\n"
        f"{formatted_logs}"
    )

    response = ollama.chat(
        model=model_name,
        messages=[{'role': 'user', 'content': prompt}]
    )
    analysis_text = response['message']['content']
    
    analysis_html = "".join([f"<p>{line}</p>" if not line.startswith('<h') else line for line in analysis_text.split("\n") if line.strip()])

    # 3.5. Build Filtered Log Table Rows (Prioritizing Warnings and Errors for Executive View)
    filtered_priority_logs = [log for log in logs if log.level.upper() in ("WARNING", "WARN", "ERROR", "CRITICAL", "FATAL")]
    display_logs = filtered_priority_logs if filtered_priority_logs else logs[:25]

    log_table_rows = ""
    for log in display_logs:
        level_upper = log.level.upper()
        badge_class = "badge-info"
        if level_upper in ("WARNING", "WARN"):
            badge_class = "badge-warning"
        elif level_upper in ("ERROR", "FATAL"):
            badge_class = "badge-error"
        elif level_upper == "CRITICAL":
            badge_class = "badge-critical"

        metrics_html = ""
        log_metrics = getattr(log, 'metrics', None)
        if log_metrics and isinstance(log_metrics, dict):
            metrics_snippets = [f"<strong>{k.upper()}</strong>: {v}%" if isinstance(v, (int, float)) else f"<strong>{k.upper()}</strong>: {v}" for k, v in log_metrics.items()]
            metrics_html = f"<div style='font-size: 7.5pt; color: #475569; margin-top: 3px; background: #f8fafc; padding: 3px 6px; border-radius: 3px; border: 1px solid #e2e8f0;'>📊 " + " | ".join(metrics_snippets) + "</div>"

        machine_display = getattr(log, 'machine_id', None)
        machine_tag = f"<br/><span style='font-size: 7.5pt; color: #64748b;'>🖥️ {machine_display}</span>" if machine_display else ""

        log_table_rows += f"""
        <tr>
            <td>{log.timestamp}</td>
            <td><span class="badge {badge_class}">{level_upper}</span></td>
            <td><strong>{log.service_name}</strong>{machine_tag}</td>
            <td>{log.message}{metrics_html}</td>
        </tr>
        """

    # 4. Build Custom A4 HTML Layout Template
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
    <meta charset="utf-8">
    <style>
        *, *::before, *::after {{ box-sizing: border-box; }}
        @page {{
            size: A4;
            margin: 15mm 15mm;
            background-color: #f8fafc;
            @bottom-right {{
                content: "Page " counter(page) " of " counter(pages);
                font-size: 8pt;
                color: #64748b;
                font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            }}
        }}
        body {{
            margin: 0;
            padding: 0;
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            color: #1e293b;
            background-color: #f8fafc;
            line-height: 1.4;
        }}
        .header-banner {{
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            color: white;
            margin: -15mm -15mm 20mm -15mm;
            padding: 20px 20mm;
            border-bottom: 4px solid #3b82f6;
        }}
        .header-banner h1 {{
            margin: 0 0 4px 0;
            font-size: 18pt;
            font-weight: 700;
        }}
        .header-banner p {{
            margin: 0;
            font-size: 8.5pt;
            color: #94a3b8;
        }}
        .metrics-grid {{
            width: 100%;
            border-collapse: separate;
            border-spacing: 10px;
            margin-left: -10px;
            margin-right: -10px;
            margin-bottom: 15px;
        }}
        .metric-card {{
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 10px 12px;
            text-align: center;
            width: 25%;
        }}
        .metric-card .label {{
            font-size: 7.5pt;
            text-transform: uppercase;
            color: #64748b;
            font-weight: bold;
            display: block;
            margin-bottom: 4px;
        }}
        .metric-card .value {{
            font-size: 14pt;
            font-weight: 800;
            color: #0f172a;
        }}
        .metric-card .value.danger {{
            color: #ef4444;
        }}
        .meta-box {{
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 10px 14px;
            margin-bottom: 15px;
            font-size: 8.5pt;
        }}
        .meta-box table {{
            width: 100%;
            border-collapse: collapse;
        }}
        .meta-box td {{
            padding: 3px 0;
            vertical-align: top;
        }}
        .meta-box .label-col {{
            font-weight: bold;
            color: #0f172a;
            width: 28%;
        }}
        .meta-box .val-col {{
            color: #334155;
            width: 72%;
        }}
        h2 {{
            font-size: 11pt;
            color: #0f172a;
            border-left: 4px solid #3b82f6;
            padding-left: 8px;
            margin-top: 18px;
            margin-bottom: 8px;
            page-break-after: avoid;
        }}
        h3 {{
            font-size: 9.5pt;
            color: #1e293b;
            margin-top: 12px;
            margin-bottom: 4px;
        }}
        .chart-container {{
            text-align: center;
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 10px;
            margin-bottom: 15px;
            page-break-inside: avoid;
        }}
        .chart-container img {{
            max-width: 100%;
            height: auto;
        }}
        .content-card {{
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 14px;
            font-size: 9pt;
            color: #334155;
            margin-bottom: 15px;
        }}
        .log-table-container {{
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            overflow: hidden;
            margin-bottom: 15px;
        }}
        table.log-table {{
            width: 100%;
            border-collapse: collapse;
            font-size: 8pt;
            text-align: left;
        }}
        table.log-table th {{
            background-color: #f1f5f9;
            color: #0f172a;
            font-weight: bold;
            padding: 6px 8px;
            border-bottom: 2px solid #e2e8f0;
        }}
        table.log-table td {{
            padding: 6px 8px;
            border-bottom: 1px solid #e2e8f0;
            color: #334155;
            word-break: break-word;
        }}
        table.log-table tr:last-child td {{
            border-bottom: none;
        }}
        .badge {{
            padding: 2px 5px;
            border-radius: 4px;
            font-size: 7pt;
            font-weight: bold;
            text-transform: uppercase;
        }}
        .badge-info {{ background-color: #dbeafe; color: #1e40af; }}
        .badge-warning {{ background-color: #fef3c7; color: #b45309; }}
        .badge-error {{ background-color: #fee2e2; color: #b91c1c; }}
        .badge-critical {{ background-color: #7f1d1d; color: #fee2e2; }}
    </style>
    </head>
    <body>
        <div class="header-banner">
            <h1>Executive System Log Analyzer Report</h1>
            <p>High-Level Health Briefing, Metrics Analytics, and Actionable Recommendations</p>
        </div>

        <table class="metrics-grid">
            <tr>
                <td class="metric-card">
                    <span class="label">Total Events</span>
                    <span class="value">{total_records}</span>
                </td>
                <td class="metric-card">
                    <span class="label">Critical Issues</span>
                    <span class="value danger">{critical_errors}</span>
                </td>
                <td class="metric-card">
                    <span class="label">Error Rate</span>
                    <span class="value">{error_rate:.1f}%</span>
                </td>
                <td class="metric-card">
                    <span class="label">Active Services</span>
                    <span class="value">{len(service_set)}</span>
                </td>
            </tr>
        </table>

        <div class="meta-box">
            <table>
                <tr>
                    <td class="label-col">Report Generated:</td>
                    <td class="val-col">{report_generated_str}</td>
                </tr>
                <tr>
                    <td class="label-col">Filtered Time Range:</td>
                    <td class="val-col">{time_range_str}</td>
                </tr>
                <tr>
                    <td class="label-col">Targeted Systems / Services:</td>
                    <td class="val-col">{services_str}</td>
                </tr>
                <tr>
                    <td class="label-col">Targeted Machine Nodes:</td>
                    <td class="val-col">{machines_str}</td>
                </tr>
                <tr>
                    <td class="label-col">Targeted Users:</td>
                    <td class="val-col">{users_str}</td>
                </tr>
                <tr>
                    <td class="label-col">Total Entries Processed:</td>
                    <td class="val-col">{total_records} record(s)</td>
                </tr>
            </table>
        </div>

        <h2>Executive Engineering Summary & Recommendations</h2>
        <div class="content-card">
            {analysis_html}
        </div>

        <h2>Diagnostic Metrics Visualization</h2>
        <div class="chart-container">
            <img src="{chart_path}" alt="Log Severity Breakdown" />
        </div>

        <h2>Actionable Priority Log Entries</h2>
        <div class="log-table-container">
            <table class="log-table">
                <thead>
                    <tr>
                        <th style="width: 22%;">Timestamp</th>
                        <th style="width: 12%;">Level</th>
                        <th style="width: 20%;">Service & Node</th>
                        <th style="width: 46%;">Message & Telemetry</th>
                    </tr>
                </thead>
                <tbody>
                    {log_table_rows}
                </tbody>
            </table>
        </div>
    </body>
    </html>
    """

    html_filename = "temp_report.html"
    with open(html_filename, "w", encoding="utf-8") as f:
        f.write(html_content)

    # 5. Compile directly to memory buffer using WeasyPrint
    pdf_buffer = BytesIO()
    HTML(html_filename).write_pdf(pdf_buffer)
    pdf_buffer.seek(0)
    pdf_bytes = pdf_buffer.getvalue()

    # Clean up temporary artifacts
    if os.path.exists(chart_path):
        os.remove(chart_path)
    if os.path.exists(html_filename):
        os.remove(html_filename)

    return pdf_bytes