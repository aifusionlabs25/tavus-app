import csv
import sys
import datetime

def analyze(file_path):
    try:
        # Open with utf-16 assuming that's what we produced
        with open(file_path, 'r', encoding='utf-16') as f:
            reader = csv.reader(f)
            header = next(reader)
            print(f"Header: {header}")
            
            # Find indices
            try:
                idx_created = -1
                idx_duration = -1
                for i, h in enumerate(header):
                    if 'created' in h.lower(): idx_created = i
                    if 'duration' in h.lower(): idx_duration = i
                
                print(f"Indices: Created={idx_created}, Duration={idx_duration}")
                
                total_seconds = 0.0
                print(f"\n{'Created':<30} | {'Duration (s)':<15} | {'Duration (m)':<15}")
                print("-" * 65)
                
                for row in reader:
                    if len(row) <= idx_created: continue
                    created = row[idx_created]
                    
                    if '2025-12-11' in created or '2025-12-12' in created:
                        dur_str = row[idx_duration] if idx_duration != -1 else "0"
                        try:
                            dur = float(dur_str)
                        except:
                            dur = 0.0
                        
                        total_seconds += dur
                        print(f"{created:<30} | {dur:<15.1f} | {dur/60:<15.1f}")

                print("-" * 65)
                print(f"TOTAL Duration: {total_seconds:.1f} seconds")
                print(f"TOTAL Duration: {total_seconds/60:.2f} minutes")
                
            except ValueError as e:
                print(f"Column detection error: {e}")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    analyze(sys.argv[1])
