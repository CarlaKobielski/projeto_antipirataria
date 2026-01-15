import { Controller, Get, Param } from '@nestjs/common';
import { PlansService, Plan } from './plans.service';

@Controller('plans')
export class PlansController {
    constructor(private plansService: PlansService) { }

    @Get()
    getAllPlans(): Plan[] {
        return this.plansService.getAllPlans();
    }

    @Get(':id')
    getPlan(@Param('id') id: string): Plan | undefined {
        return this.plansService.getPlanById(id);
    }
}
