import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WorksController } from './works/works.controller';
import { WorksService } from './works/works.service';
import { CasesController } from './cases/cases.controller';
import { CasesService } from './cases/cases.service';
import { ReportsController } from './reports/reports.controller';
import { ReportsService } from './reports/reports.service';
import { PrismaService } from './prisma/prisma.service';

@Module({
    imports: [ConfigModule.forRoot({ isGlobal: true })],
    controllers: [WorksController, CasesController, ReportsController],
    providers: [WorksService, CasesService, ReportsService, PrismaService],
})
export class AppModule { }
