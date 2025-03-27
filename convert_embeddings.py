import json
import pyarrow.parquet as pq
import numpy as np

class NumpyEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        return json.JSONEncoder.default(self, obj)

# Read parquet file
table = pq.read_table('../seinfeld_embeddings.parquet')
df = table.to_pandas()

# Convert to list of dictionaries
data = df.to_dict('records')

# Save as JSON
with open('public/data/embeddings.json', 'w') as f:
    json.dump(data, f, cls=NumpyEncoder) 