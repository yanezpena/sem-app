import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { ExpenseQueryDto } from './dto/expense-query.dto';

@Controller('expenses')
@UseGuards(AuthGuard('jwt'))
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Post()
  create(@Req() req: any, @Body() dto: CreateExpenseDto) {
    return this.expensesService.create(req.user.id, dto);
  }

  @Post('upload-receipt')
  @UseInterceptors(
    FileInterceptor('receipt', {
      storage: diskStorage({
        destination: join(process.cwd(), 'uploads'),
        filename: (_, file, cb) => {
          const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          let ext = extname(file.originalname || '');
          if (!ext && file.mimetype) {
            const m = file.mimetype.match(/image\/(jpeg|png|webp)/i);
            ext = m ? `.${m[1]}` : '.jpg';
          }
          if (!ext) ext = '.jpg';
          cb(null, `${unique}${ext}`);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
      fileFilter: (_, file, cb) => {
        const allowedExt = /\.(jpg|jpeg|png|webp)$/i.test(file.originalname || '');
        const allowedMime = /^image\/(jpeg|jpg|png|webp)$/i.test(file.mimetype || '');
        const allowed = allowedExt || allowedMime;
        cb(allowed ? null : new BadRequestException('Only image files allowed'), allowed);
      },
    }),
  )
  uploadReceipt(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');
    return { url: `/uploads/${file.filename}` };
  }

  @Get()
  findAll(@Req() req: any, @Query() query: ExpenseQueryDto) {
    return this.expensesService.findAll(req.user.id, query);
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.expensesService.findOne(req.user.id, id);
  }

  @Patch(':id')
  update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateExpenseDto,
  ) {
    return this.expensesService.update(req.user.id, id, dto);
  }

  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.expensesService.remove(req.user.id, id);
  }
}
