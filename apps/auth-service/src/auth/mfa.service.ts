import { Injectable } from '@nestjs/common';
import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';

@Injectable()
export class MfaService {
    private readonly issuer = 'ProtecLiter';

    generateSecret(email: string): { secret: string; otpauthUrl: string } {
        const secret = authenticator.generateSecret();
        const otpauthUrl = authenticator.keyuri(email, this.issuer, secret);

        return { secret, otpauthUrl };
    }

    async generateQrCode(otpauthUrl: string): Promise<string> {
        return QRCode.toDataURL(otpauthUrl);
    }

    verifyToken(secret: string, token: string): boolean {
        return authenticator.verify({ token, secret });
    }
}
