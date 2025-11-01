"""
What-If Analysis Service for scenario planning and sensitivity analysis
"""
from typing import List, Dict
from app.models.logistics import (
    WhatIfAnalysisRequest,
    WhatIfAnalysisResult,
    WhatIfScenario,
    OptimizationRequest,
    Port,
    Plant,
    Vessel,
    RailwayRake
)
from app.services.optimizer import OptimizationEngine
import copy


class WhatIfAnalyzer:
    """
    Scenario analysis tool for logistics planners
    Allows testing different conditions and their impact on costs
    """
    
    def __init__(self):
        self.optimizer = OptimizationEngine()
    
    def analyze_scenarios(self, request: WhatIfAnalysisRequest) -> List[WhatIfAnalysisResult]:
        """
        Run what-if analysis for multiple scenarios
        """
        results = []
        
        # Get baseline solution
        baseline_solution = self.optimizer.optimize(request.base_request)
        baseline_cost = baseline_solution.total_cost
        
        # Analyze each scenario
        for scenario in request.scenarios:
            # Apply scenario changes
            modified_request = self._apply_scenario(request.base_request, scenario)
            
            # Optimize with changes
            scenario_solution = self.optimizer.optimize(modified_request)
            
            # Calculate differences
            cost_diff = scenario_solution.total_cost - baseline_cost
            cost_diff_pct = (cost_diff / baseline_cost) * 100 if baseline_cost > 0 else 0
            
            # Generate insights
            insights = self._generate_insights(scenario, scenario_solution, baseline_solution)
            
            results.append(WhatIfAnalysisResult(
                scenario_name=scenario.scenario_name,
                solution=scenario_solution,
                cost_difference=cost_diff,
                cost_difference_percentage=cost_diff_pct,
                key_insights=insights
            ))
        
        return results
    
    def _apply_scenario(
        self,
        base_request: OptimizationRequest,
        scenario: WhatIfScenario
    ) -> OptimizationRequest:
        """Apply scenario modifications to base request"""
        modified = copy.deepcopy(base_request)
        
        # Apply parameter changes
        for param, multiplier in scenario.changes.items():
            if param == "railway_cost_multiplier":
                for rake in modified.available_rakes:
                    rake.cost_per_km_per_mt *= multiplier
            
            elif param == "port_handling_cost_multiplier":
                for port in modified.ports:
                    port.handling_cost_per_mt *= multiplier
            
            elif param == "demurrage_rate_multiplier":
                for vessel in modified.vessels:
                    vessel.demurrage_rate_per_day *= multiplier
            
            elif param == "discharge_rate_multiplier":
                for port in modified.ports:
                    port.discharge_rate_mt_per_day *= multiplier
        
        # Apply port closures
        if scenario.port_closures:
            modified.ports = [p for p in modified.ports if p.name not in scenario.port_closures]
            # Also update distances
            modified.port_distances = [
                d for d in modified.port_distances if d.port not in scenario.port_closures
            ]
        
        # Add additional vessels
        if scenario.additional_vessels:
            modified.vessels.extend(scenario.additional_vessels)
        
        # Modify demand
        if scenario.modified_demand:
            for plant in modified.plants:
                if plant.name in scenario.modified_demand:
                    plant.requirements = scenario.modified_demand[plant.name]
        
        return modified
    
    def _generate_insights(
        self,
        scenario: WhatIfScenario,
        scenario_solution,
        baseline_solution
    ) -> List[str]:
        """Generate actionable insights from scenario analysis"""
        insights = []
        
        # Cost comparison
        cost_breakdown_comparison = {
            "ocean_freight": scenario_solution.cost_breakdown.ocean_freight - baseline_solution.cost_breakdown.ocean_freight,
            "port_costs": scenario_solution.cost_breakdown.port_costs - baseline_solution.cost_breakdown.port_costs,
            "railway_freight": scenario_solution.cost_breakdown.railway_freight - baseline_solution.cost_breakdown.railway_freight,
            "demurrage": scenario_solution.cost_breakdown.demurrage - baseline_solution.cost_breakdown.demurrage,
        }
        
        # Find biggest cost change
        max_change_category = max(cost_breakdown_comparison.items(), key=lambda x: abs(x[1]))
        if abs(max_change_category[1]) > 1000:
            change_direction = "increased" if max_change_category[1] > 0 else "decreased"
            insights.append(
                f"Largest impact on {max_change_category[0]}: "
                f"{change_direction} by ${abs(max_change_category[1]):,.0f}"
            )
        
        # Feasibility check
        if not scenario_solution.is_feasible:
            insights.append("⚠️ This scenario results in an infeasible solution")
            # Identify failed constraints
            failed_constraints = [
                k for k, v in scenario_solution.constraints_satisfied.items() if not v
            ]
            if failed_constraints:
                insights.append(f"Failed constraints: {', '.join(failed_constraints)}")
        
        # Demurrage warning
        if scenario_solution.cost_breakdown.demurrage > baseline_solution.cost_breakdown.demurrage * 1.5:
            insights.append(
                f"⚠️ Significant demurrage increase: "
                f"${scenario_solution.cost_breakdown.demurrage:,.0f} "
                f"(+{((scenario_solution.cost_breakdown.demurrage / baseline_solution.cost_breakdown.demurrage - 1) * 100):.0f}%)"
            )
        
        # Port utilization
        if scenario.port_closures:
            insights.append(
                f"Port closure impact: Remaining ports handling increased volumes"
            )
        
        return insights
    
    def sensitivity_analysis(
        self,
        base_request: OptimizationRequest,
        parameter: str,
        min_value: float,
        max_value: float,
        steps: int = 5
    ) -> List[WhatIfAnalysisResult]:
        """
        Perform sensitivity analysis on a single parameter
        """
        results = []
        step_size = (max_value - min_value) / (steps - 1)
        
        for i in range(steps):
            multiplier = min_value + (i * step_size)
            
            scenario = WhatIfScenario(
                scenario_name=f"{parameter}_{multiplier:.2f}x",
                description=f"{parameter} multiplied by {multiplier:.2f}",
                changes={parameter: multiplier}
            )
            
            analysis_request = WhatIfAnalysisRequest(
                base_request=base_request,
                scenarios=[scenario]
            )
            
            scenario_results = self.analyze_scenarios(analysis_request)
            results.extend(scenario_results)
        
        return results
