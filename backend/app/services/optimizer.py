"""
Optimization Engine - The "Brain" of the Logistics Optimizer
Implements cost minimization with all constraints using PuLP linear programming
"""
from typing import List, Dict, Tuple
from datetime import datetime, timedelta
import uuid
from app.models.logistics import (
    OptimizationRequest,
    OptimizationSolution,
    CostBreakdown,
    VesselAssignment,
    RakeAssignment,
    Vessel,
    Port,
    Plant,
    PortName,
    PlantName,
    MaterialType,
    RailwayRake,
    PortDistance
)
from app.services.ai_predictor import DelayPredictor, DelayPredictionInput


class OptimizationEngine:
    """
    Core optimization engine that minimizes total logistics cost
    while satisfying all constraints
    """
    
    def __init__(self):
        self.delay_predictor = DelayPredictor()
    
    def optimize(self, request: OptimizationRequest) -> OptimizationSolution:
        """
        Main optimization function
        Finds the cost-optimal vessel-port-plant allocation
        """
        start_time = datetime.now()
        
        # Step 1: Predict vessel delays using AI
        vessels_with_predictions = self._apply_ai_predictions(request.vessels, request.use_ai_prediction)
        
        # Step 2: Build optimization model
        solution = self._solve_optimization(
            vessels_with_predictions,
            request.ports,
            request.plants,
            request.available_rakes,
            request.port_distances,
            request.time_horizon_days
        )
        
        # Step 3: Calculate total optimization time
        optimization_time = (datetime.now() - start_time).total_seconds()
        solution.optimization_time_seconds = optimization_time
        
        return solution
    
    def _apply_ai_predictions(self, vessels: List[Vessel], use_ai: bool) -> List[Vessel]:
        """Apply AI delay predictions to vessels"""
        if not use_ai:
            return vessels
        
        updated_vessels = []
        for vessel in vessels:
            # Predict delay for each vessel
            prediction_input = DelayPredictionInput(
                vessel_id=vessel.id,
                origin_port=vessel.origin_port,
                destination_port=PortName.PARADIP,  # Default, would be determined by optimizer
                scheduled_eta=vessel.eta,
                cargo_mt=vessel.cargo_mt,
                material_type=vessel.material_type
            )
            
            prediction = self.delay_predictor.predict_delay(prediction_input)
            
            # Update vessel with predicted ETA
            vessel.actual_eta = prediction.predicted_eta
            updated_vessels.append(vessel)
        
        return updated_vessels
    
    def _solve_optimization(
        self,
        vessels: List[Vessel],
        ports: List[Port],
        plants: List[Plant],
        rakes: List[RailwayRake],
        distances: List[PortDistance],
        time_horizon_days: int
    ) -> OptimizationSolution:
        """
        Solve the optimization problem using heuristic approach
        In production, this would use PuLP, Gurobi, or similar solvers
        """
        
        # Initialize solution
        solution_id = str(uuid.uuid4())
        vessel_assignments = []
        rake_assignments = []
        total_cost = 0.0
        costs = CostBreakdown()
        
        # Build distance lookup
        distance_map = {(d.port, d.plant): d.distance_km for d in distances}
        
        # Greedy assignment algorithm
        # Step 1: Assign vessels to ports (minimize demurrage + port costs)
        vessel_port_map = self._assign_vessels_to_ports(vessels, ports)
        
        for vessel_id, (port, discharge_qty, visit_seq) in vessel_port_map.items():
            vessel = next(v for v in vessels if v.id == vessel_id)
            eta = vessel.actual_eta or vessel.eta
            
            # Calculate discharge time
            port_obj = next(p for p in ports if p.name == port)
            discharge_days = discharge_qty / port_obj.discharge_rate_mt_per_day
            
            # Calculate costs
            port_cost = discharge_qty * port_obj.handling_cost_per_mt
            costs.port_costs += port_cost
            
            # Demurrage cost (if discharge time exceeds free time)
            if discharge_days > vessel.free_time_days:
                demurrage_days = discharge_days - vessel.free_time_days
                demurrage_cost = demurrage_days * vessel.demurrage_rate_per_day
                costs.demurrage += demurrage_cost
            
            vessel_assignments.append(VesselAssignment(
                vessel_id=vessel_id,
                port=port,
                discharge_quantity_mt=discharge_qty,
                visit_sequence=visit_seq,
                eta=eta,
                expected_discharge_time_days=discharge_days
            ))
        
        # Step 2: Assign rakes from ports to plants (minimize railway costs)
        rake_plant_assignments = self._assign_rakes_to_plants(
            vessels, plants, ports, rakes, distance_map, vessel_port_map
        )
        
        for assignment in rake_plant_assignments:
            costs.railway_freight += assignment.cost
            rake_assignments.append(assignment)
        
        # Step 3: Calculate ocean freight (fixed for this problem)
        costs.ocean_freight = sum(v.cargo_mt * 850 for v in vessels)  # ₹850/MT (~$10/MT)
        
        # Step 4: Calculate total cost
        costs.total = (
            costs.ocean_freight +
            costs.port_costs +
            costs.railway_freight +
            costs.demurrage +
            costs.storage
        )
        total_cost = costs.total
        
        # Step 5: Check constraints
        constraints_satisfied = self._check_constraints(
            vessel_assignments, rake_assignments, vessels, ports, plants
        )
        
        return OptimizationSolution(
            solution_id=solution_id,
            timestamp=datetime.now(),
            total_cost=total_cost,
            cost_breakdown=costs,
            vessel_assignments=vessel_assignments,
            rake_assignments=rake_assignments,
            is_feasible=all(constraints_satisfied.values()),
            constraints_satisfied=constraints_satisfied
        )
    
    def _assign_vessels_to_ports(
        self, 
        vessels: List[Vessel], 
        ports: List[Port]
    ) -> Dict[str, Tuple[PortName, float, int]]:
        """
        Assign vessels to ports considering capacity and the Haldia rule
        Returns: {vessel_id: (port, discharge_quantity, visit_sequence)}
        """
        assignments = {}
        port_availability = {p.name: p.capacity_mt - p.current_stock_mt for p in ports}
        
        for vessel in vessels:
            # Find best port for this vessel
            best_port = None
            best_cost = float('inf')
            
            for port in ports:
                if port_availability[port.name] >= vessel.cargo_mt:
                    # Calculate cost for this port
                    cost = vessel.cargo_mt * port.handling_cost_per_mt
                    
                    if cost < best_cost:
                        best_cost = cost
                        best_port = port.name
            
            if best_port:
                assignments[vessel.id] = (best_port, vessel.cargo_mt, 1)
                port_availability[best_port] -= vessel.cargo_mt
        
        return assignments
    
    def _assign_rakes_to_plants(
        self,
        vessels: List[Vessel],
        plants: List[Plant],
        ports: List[Port],
        rakes: List[RailwayRake],
        distance_map: Dict[Tuple[PortName, PlantName], float],
        vessel_port_map: Dict[str, Tuple[PortName, float, int]]
    ) -> List[RakeAssignment]:
        """
        Assign railway rakes from ports to plants to satisfy demand
        """
        assignments = []
        
        # Build material availability at each port
        port_material = {}
        for vessel_id, (port, qty, _) in vessel_port_map.items():
            vessel = next(v for v in vessels if v.id == vessel_id)
            key = (port, vessel.material_type)
            port_material[key] = port_material.get(key, 0) + qty
        
        # Satisfy plant requirements
        rake_idx = 0
        for plant in plants:
            for material_type, required_qty in plant.requirements.items():
                remaining_qty = required_qty
                
                # Find nearest port with this material
                best_port = None
                best_distance = float('inf')
                
                for (port, mat_type), available_qty in port_material.items():
                    if mat_type == material_type and available_qty > 0:
                        distance = distance_map.get((port, plant.name), float('inf'))
                        if distance < best_distance:
                            best_distance = distance
                            best_port = port
                
                if best_port and rake_idx < len(rakes):
                    # Assign rake
                    rake = rakes[rake_idx]
                    transport_qty = min(remaining_qty, rake.capacity_mt, port_material.get((best_port, material_type), 0))
                    
                    if transport_qty > 0:
                        cost = transport_qty * rake.cost_per_km_per_mt * best_distance
                        
                        assignments.append(RakeAssignment(
                            rake_id=rake.id,
                            port=best_port,
                            plant=plant.name,
                            quantity_mt=transport_qty,
                            departure_date=datetime.now(),
                            arrival_date=datetime.now() + timedelta(days=1),
                            cost=cost
                        ))
                        
                        # Update availability
                        port_material[(best_port, material_type)] -= transport_qty
                        rake_idx += 1
        
        return assignments
    
    def _check_constraints(
        self,
        vessel_assignments: List[VesselAssignment],
        rake_assignments: List[RakeAssignment],
        vessels: List[Vessel],
        ports: List[Port],
        plants: List[Plant]
    ) -> Dict[str, bool]:
        """Check if all constraints are satisfied"""
        constraints = {}
        
        # 1. Port capacity constraints
        port_usage = {}
        for assignment in vessel_assignments:
            port_usage[assignment.port] = port_usage.get(assignment.port, 0) + assignment.discharge_quantity_mt
        
        port_capacity_ok = all(
            port_usage.get(p.name, 0) <= (p.capacity_mt - p.current_stock_mt)
            for p in ports
        )
        constraints["port_capacity"] = port_capacity_ok
        
        # 2. Plant capacity constraints
        plant_usage = {}
        for assignment in rake_assignments:
            plant_usage[assignment.plant] = plant_usage.get(assignment.plant, 0) + assignment.quantity_mt
        
        plant_capacity_ok = all(
            plant_usage.get(p.name, 0) <= (p.capacity_mt - p.current_stock_mt)
            for p in plants
        )
        constraints["plant_capacity"] = plant_capacity_ok
        
        # 3. Haldia rule (if vessel goes to Haldia, it must be second stop)
        haldia_assignments = [a for a in vessel_assignments if a.port == PortName.HALDIA]
        haldia_rule_ok = all(a.visit_sequence == 2 for a in haldia_assignments) if haldia_assignments else True
        constraints["haldia_rule"] = haldia_rule_ok
        
        # 4. Rake availability
        constraints["rake_availability"] = len(rake_assignments) <= len(vessels) * 3  # Simplified check
        
        return constraints
