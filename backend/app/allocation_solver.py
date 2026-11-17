"""Bounded local MILP. Also runs as a private subprocess with JSON stdin/stdout."""
import json
import sys
import numpy as np
from scipy.optimize import milp, Bounds, LinearConstraint

def solve(plan):
    items=plan["initiatives"]; n=len(items); indexes={item["id"]:i for i,item in enumerate(items)}
    matrix=[[item["cost"] for item in items],[item["hours"] for item in items]]
    upper=[plan["budget"],plan["staff_hours"]]
    for i,item in enumerate(items):
        for dependency in item["dependencies"]:
            row=[0.0]*n;row[i]=1;row[indexes[dependency]]=-1;matrix.append(row);upper.append(0)
    result=milp(-np.array([item["value"] for item in items]),integrality=np.ones(n),
                bounds=Bounds([1 if item["required"] else 0 for item in items],np.ones(n)),
                constraints=LinearConstraint(matrix,[-np.inf]*len(matrix),upper),
                options={"time_limit":plan["time_limit"],"node_limit":100000,"mip_rel_gap":0.0})
    status={0:"optimal",1:"time_limited",2:"infeasible"}.get(result.status,"failed")
    selected=None
    if result.status in {0,1} and result.x is not None and np.all(np.isfinite(result.x)):
        rounded=np.rint(result.x)
        if np.all((rounded>=0)&(rounded<=1)) and np.max(np.abs(result.x-rounded))<1e-5 and np.all(np.asarray(matrix)@rounded <= np.asarray(upper)+1e-6) and all(not item["required"] or rounded[i]==1 for i,item in enumerate(items)):
            selected=[item["id"] for i,item in enumerate(items) if rounded[i]==1]
    chosen=[item for item in items if selected is not None and item["id"] in selected]
    return {"status":status,"selected":selected,"feasible":selected is not None,
            "cost":sum(i["cost"] for i in chosen) if selected is not None else None,
            "hours":sum(i["hours"] for i in chosen) if selected is not None else None,
            "value":sum(i["value"] for i in chosen) if selected is not None else None,
            "explanation":"Maximizes the sum of entered estimated values under budget, staffing, required-item and dependency constraints. Excluded initiatives are not selected in this joint solution; this is not an individual ranking or a causal forecast."}

if __name__=="__main__":
    print(json.dumps(solve(json.load(sys.stdin)),allow_nan=False))
