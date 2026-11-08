import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { PlaylistMetadata, playlistStorageService } from '@/services/PlaylistStorageService';
import { Copy, QrCode, RefreshCw, Trash2, Download, Calendar } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { QRCodeGenerator } from './QRCodeGenerator';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PlaylistManagerProps {
  playlists: PlaylistMetadata[];
  onRegenerate: (playlistId: string) => void;
  onDelete: (playlistId: string) => void;
  onRefresh: () => void;
}

export const PlaylistManager: React.FC<PlaylistManagerProps> = ({
  playlists,
  onRegenerate,
  onDelete,
  onRefresh
}) => {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState<PlaylistMetadata | null>(null);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [qrUrl, setQrUrl] = useState('');

  const handleCopyUrl = (url: string, name: string) => {
    navigator.clipboard.writeText(url).then(() => {
      toast.success(`Link da playlist "${name}" copiado para área de transferência.`);
    }).catch(() => {
      toast.error("Erro ao copiar link.");
    });
  };

  const handleShowQR = (url: string) => {
    setQrUrl(url);
    setQrDialogOpen(true);
  };

  const handleDownload = (url: string, name: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name.replace(/[^a-zA-Z0-9]/g, '_')}.m3u`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    toast.success(`Baixando playlist "${name}".`);
  };

  const confirmDelete = (playlist: PlaylistMetadata) => {
    setSelectedPlaylist(playlist);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (selectedPlaylist) {
      onDelete(selectedPlaylist.id);
      setDeleteDialogOpen(false);
      setSelectedPlaylist(null);
    }
  };

  if (playlists.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>📚 Playlists Salvas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>Nenhuma playlist salva ainda.</p>
            <p className="text-sm mt-2">Gere e salve uma playlist permanentemente para vê-la aqui.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>📚 Playlists Salvas ({playlists.length})</CardTitle>
          <Button variant="outline" size="sm" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {playlists.map((playlist) => (
            <Card key={playlist.id} className="border">
              <CardContent className="p-4">
                <div className="flex flex-col space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{playlist.name}</h3>
                      <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>
                          {format(playlist.createdAt, "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">
                      {playlist.stats.totalItems} itens
                    </Badge>
                    <Badge variant="secondary">
                      {playlistStorageService.formatFileSize(playlist.stats.fileSize)}
                    </Badge>
                    {playlist.stats.filmes > 0 && (
                      <Badge variant="outline">
                        🎬 {playlist.stats.filmes} filmes
                      </Badge>
                    )}
                    {playlist.stats.series > 0 && (
                      <Badge variant="outline">
                        📺 {playlist.stats.series} séries
                      </Badge>
                    )}
                    {playlist.stats.episodios > 0 && (
                      <Badge variant="outline">
                        ▶️ {playlist.stats.episodios} episódios
                      </Badge>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyUrl(playlist.fileUrl, playlist.name)}
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      Copiar Link
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleShowQR(playlist.fileUrl)}
                    >
                      <QrCode className="h-4 w-4 mr-1" />
                      QR Code
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(playlist.fileUrl, playlist.name)}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Baixar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onRegenerate(playlist.id)}
                    >
                      <RefreshCw className="h-4 w-4 mr-1" />
                      Regenerar
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => confirmDelete(playlist)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Excluir
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a playlist "{selectedPlaylist?.name}"? Esta ação não
              pode ser desfeita e o link permanente deixará de funcionar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <QRCodeGenerator
        open={qrDialogOpen}
        onOpenChange={setQrDialogOpen}
        url={qrUrl}
      />
    </>
  );
};
