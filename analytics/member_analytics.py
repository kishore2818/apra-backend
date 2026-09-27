"""
APRA Association Member Analytics & Demographic Report
Uses Python + Pandas to generate demographic summaries, owner-vs-tenant insights,
and exports clean Excel/CSV reports for committee meetings.
"""

import json
import os
import pandas as pd

DATA_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'members_db.json')

def load_data():
    with open(DATA_PATH, 'r', encoding='utf-8') as f:
        return json.load(f)

def run_analytics():
    records = load_data()
    df = pd.DataFrame(records)
    
    print("\n=======================================================")
    print("  APRA ASSOCIATION - PONNAPPA NADAR NAGAR, NAGERCOIL")
    print("  MEMBERSHIP DEMOGRAPHIC & CIVIC ANALYTICS REPORT")
    print("=======================================================\n")
    
    # 1. Overall counts
    total_members = len(df)
    approved_count = len(df[df['status'] == 'Approved'])
    pending_count = len(df[df['status'].str.contains('Pending', case=False, na=False)])
    
    print(f"Total Applications:    {total_members}")
    print(f"Approved Members:      {approved_count}")
    print(f"Pending Applications:  {pending_count}")
    print(f"Admission Dues (₹):    ₹{approved_count * 100} /-\n")
    
    # 2. Resident Type Breakdown
    print("--- Resident Distribution (Owners vs Tenants) ---")
    type_counts = df['residentType'].value_counts()
    for r_type, count in type_counts.items():
        pct = (count / total_members) * 100
        print(f"  {r_type:10s}: {count} ({pct:.1f}%)")
    print()

    # 3. Age Demographics
    print("--- Age Demographics ---")
    if 'age' in df.columns:
        df['age'] = pd.to_numeric(df['age'], errors='coerce')
        bins = [18, 35, 50, 65, 120]
        labels = ['18-35 (Youth/Young Adults)', '36-50 (Middle Age)', '51-65 (Senior Working)', '65+ (Elders)']
        df['age_group'] = pd.cut(df['age'], bins=bins, labels=labels, right=True)
        print(df['age_group'].value_counts().sort_index())
    print()

    # 4. Street Distribution
    print("--- Street-wise Member Density ---")
    print(df['street'].value_counts())
    print("\nReport completed successfully.")

if __name__ == '__main__':
    run_analytics()
